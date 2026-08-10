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

const VALID_PLANS = new Set(['growing', 'pro', 'business'])
const VALID_BILLING = new Set(['monthly', 'annual'])

// Server-side allowlist: plan + billing period -> Stripe Price ID.
// The client never supplies a price; it can only choose a valid plan/billing
// and the server resolves the price. Values can be overridden via env vars.
const PRICE_ALLOWLIST: Record<string, Record<string, string>> = {
  growing: {
    monthly: Deno.env.get('STRIPE_PRICE_GROWING_MONTHLY') ?? 'price_1Tycu8LZEvUFW978bKkCw0RA',
    annual: Deno.env.get('STRIPE_PRICE_GROWING_ANNUAL') ?? 'price_1U19gtLZEvUFW978imQZ37q9',
  },
  pro: {
    monthly: Deno.env.get('STRIPE_PRICE_PRO_MONTHLY') ?? 'price_1TycuoLZEvUFW978trVrtQku',
    annual: Deno.env.get('STRIPE_PRICE_PRO_ANNUAL') ?? 'price_1U19kWLZEvUFW978guX6OxPS',
  },
  business: {
    monthly: Deno.env.get('STRIPE_PRICE_BUSINESS_MONTHLY') ?? 'price_1TycvULZEvUFW9784K3Yl4X6',
    annual: Deno.env.get('STRIPE_PRICE_BUSINESS_ANNUAL') ?? 'price_1U19lWLZEvUFW978AzxIX8Vi',
  },
}

// Canonical app origin: always the server-configured APP_URL, never a
// request Origin header.
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
  const stripe = new Stripe(stripeKey)

  try {
    const { user } = await getUserFromRequest(request)
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const body = await request.json()
    const plan = body?.plan as string | undefined
    const billing = body?.billing as string | undefined
    const businessId = body?.businessId as string | undefined

    if (!VALID_PLANS.has(plan ?? '') || !VALID_BILLING.has(billing ?? '')) {
      return jsonResponse({ error: 'Invalid plan or billing cycle' }, 400)
    }

    const priceId = PRICE_ALLOWLIST[plan as string]?.[billing as string]
    if (!priceId) {
      return jsonResponse(
        { error: 'Price not configured for this plan' },
        400,
      )
    }

    // A subscription entitles a business, so the client must pass the
    // business they are upgrading. Only the owner or an admin may change the
    // business's subscription.
    if (typeof businessId !== 'string' || businessId.length === 0) {
      return jsonResponse({ error: 'A business is required to subscribe' }, 400)
    }

    const admin = createAdminClient()
    const { data: member, error: memberError } = await admin
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (memberError || !member) {
      return jsonResponse(
        { error: 'You are not a member of this business' },
        403,
      )
    }

    if (member.role !== 'owner' && member.role !== 'admin') {
      return jsonResponse(
        { error: 'Only the business owner or an admin can manage the subscription' },
        403,
      )
    }

    const origin = canonicalAppUrl()

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/subscriptions?success=true`,
      cancel_url: `${origin}/subscriptions?cancelled=true`,
      client_reference_id: user.id,
      metadata: { user_id: user.id, business_id: businessId, plan, billing },
      subscription_data: {
        metadata: { user_id: user.id, business_id: businessId, plan, billing },
      },
    })

    if (!session.url) {
      return jsonResponse(
        { error: 'Could not create checkout session' },
        500,
      )
    }

    return jsonResponse({ url: session.url })
  } catch (err) {
    console.error('create-checkout error:', err)
    const message =
      err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
