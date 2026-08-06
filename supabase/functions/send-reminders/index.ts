import { createClient } from 'npm:@supabase/supabase-js@2'

function createAdminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const DAY = 24 * 60 * 60 * 1000
const RELIST_AFTER_DAYS = 28

function nextVatDeadline(): Date {
  const now = new Date()
  const year = now.getFullYear()
  const candidates = [
    new Date(year, 0, 31),
    new Date(year, 3, 30),
    new Date(year, 6, 31),
    new Date(year, 9, 31),
  ]
  const future = candidates.filter((d) => d.getTime() > now.getTime())
  if (future.length > 0) return future[0]
  return new Date(year + 1, 0, 31)
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return false

  const from = Deno.env.get('EMAIL_FROM') ?? 'SellerHQ <reminders@sellerhq.onsoftware.uk>'

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })

  if (!response.ok) {
    console.error('Resend error', response.status, await response.text())
    return false
  }
  return true
}

Deno.serve(async (request: Request) => {
  const cronSecret = Deno.env.get('REMINDERS_CRON_SECRET')
  const authorization = request.headers.get('authorization') ?? ''
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: userSettings } = await supabase.from('user_settings').select('*')
  const { data: subscriptions } = await supabase.from('subscriptions').select('*')
  const { data: businesses } = await supabase.from('businesses').select('*')
  const { data: products } = await supabase.from('products').select('*')

  const users = await supabase.auth.admin.listUsers()
  const emailByUserId = new Map<string, string>()
  for (const user of users.data.users) {
    if (user.email) emailByUserId.set(user.id, user.email)
  }

  const planByUser = new Map<string, string>()
  for (const sub of subscriptions ?? []) {
    planByUser.set(sub.user_id, sub.plan ?? 'basic')
  }

  const businessIdsByUser = new Map<string, string[]>()
  for (const biz of businesses ?? []) {
    const list = businessIdsByUser.get(biz.owner_id) ?? []
    list.push(biz.id)
    businessIdsByUser.set(biz.owner_id, list)
  }

  const productsByBusiness = new Map<string, typeof products>()
  for (const product of products ?? []) {
    const list = productsByBusiness.get(product.business_id) ?? []
    list.push(product)
    productsByBusiness.set(product.business_id, list)
  }

  let sent = 0

  for (const settingRow of userSettings ?? []) {
    const userId = settingRow.user_id
    const prefs = settingRow.settings?.notifications ?? {}
    if (!prefs.emailNotifications) continue
    if (!prefs.lowStockAlerts && !prefs.salesReminders && !prefs.taxDeadlines) continue

    const email = emailByUserId.get(userId)
    if (!email) continue

    const plan = planByUser.get(userId) ?? 'basic'
    const businessIds = businessIdsByUser.get(userId) ?? []
    const userProducts = businessIds.flatMap((b) => productsByBusiness.get(b) ?? [])

    const lowStockItems: string[] = []
    const relistItems: string[] = []
    const now = Date.now()

    if (prefs.lowStockAlerts && plan !== 'basic') {
      for (const p of userProducts) {
        if (
          p.status !== 'sold' &&
          (p.quantity ?? 1) > 0 &&
          (p.reorder_level ?? 0) > 0 &&
          (p.quantity ?? 1) <= (p.reorder_level ?? 0)
        ) {
          lowStockItems.push(`${p.name} (${p.code}) — ${p.quantity} left`)
        }
      }
    }

    if (prefs.salesReminders) {
      for (const p of userProducts) {
        if (p.status === 'listed' && p.listing_date) {
          const age = (now - new Date(p.listing_date).getTime()) / DAY
          if (age >= RELIST_AFTER_DAYS) {
            relistItems.push(`${p.name} (${p.code}) — listed ${Math.round(age)} days`)
          }
        }
      }
    }

    const taxReminder =
      prefs.taxDeadlines &&
      nextVatDeadline().getTime() - now <= 30 * DAY

    if (
      lowStockItems.length === 0 &&
      relistItems.length === 0 &&
      !taxReminder
    ) {
      continue
    }

    const sections: string[] = []

    if (lowStockItems.length > 0) {
      sections.push(`<h3>Low stock</h3><ul>${lowStockItems.map((i) => `<li>${i}</li>`).join('')}</ul>`)
    }
    if (relistItems.length > 0) {
      sections.push(`<h3>Ready to relist</h3><ul>${relistItems.map((i) => `<li>${i}</li>`).join('')}</ul>`)
    }
    if (taxReminder) {
      const deadline = nextVatDeadline().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
      sections.push(`<h3>Tax deadline</h3><p>Your next quarterly VAT return is due by <strong>${deadline}</strong>.</p>`)
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color:#17191c;">SellerHQ reminders</h2>
        ${sections.join('')}
        <p style="color:#717780; font-size:13px;">Open SellerHQ to action these items. You can adjust these reminders in Settings.</p>
      </div>
    `

    const ok = await sendEmail(email, 'Your SellerHQ reminders', html)
    if (ok) sent += 1
  }

  return new Response(JSON.stringify({ sent }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
