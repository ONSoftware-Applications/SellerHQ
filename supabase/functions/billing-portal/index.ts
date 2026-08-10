import Stripe from 'npm:stripe@22'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

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

async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return { user: null }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return { user: null }
  return { user: data.user }
}

function canonicalAppUrl(): string {
  const url = Deno.env.get('APP_URL')
  if (!url) {
    throw new Error('APP_URL is not configured')
  }
  return url.replace(/\/+$/, '')
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) {
    return jsonResponse({ error: 'STRIPE_SECRET_KEY is not configured' }, 500)
  }

  try {
    const { user } = await getUserFromRequest(request)
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const supabase = createAdminClient()

    // Resolve the business's subscription (business-scoped entitlement), or
    // fall back to the caller's own row. Only owners/admins may open the
    // portal for a business.
    const body = await request.json().catch(() => ({}))
    const businessId =
      typeof body?.businessId === 'string' && body.businessId.length > 0
        ? body.businessId
        : null

    let subscription: { stripe_customer_id: string | null } | null = null

    if (businessId) {
      const { data: member } = await supabase
        .from('business_members')
        .select('role')
        .eq('business_id', businessId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (
        member &&
        (member.role === 'owner' || member.role === 'admin')
      ) {
        const { data } = await supabase
          .from('subscriptions')
          .select('stripe_customer_id')
          .eq('business_id', businessId)
          .maybeSingle()
        subscription = data ?? null
      }
    }

    if (!subscription) {
      const { data } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .maybeSingle()
      subscription = data ?? null
    }

    if (!subscription?.stripe_customer_id) {
      return jsonResponse(
        { error: 'No billing customer found for this account' },
        400,
      )
    }

    const origin = canonicalAppUrl()

    const stripe = new Stripe(stripeKey)
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${origin}/subscriptions`,
    })

    return jsonResponse({ url: session.url })
  } catch (err) {
    console.error('billing-portal error:', err)
    return jsonResponse({ error: 'Internal error' }, 500)
  }
})
