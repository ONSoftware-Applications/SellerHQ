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
    if (!user.email) {
      return jsonResponse({ error: 'Account has no email address' }, 400)
    }

    const body = await request.json().catch(() => ({}))
    const businessId =
      typeof body?.businessId === 'string' && body.businessId.length > 0
        ? body.businessId
        : null

    const stripe = new Stripe(stripeKey)

    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })
    const customer = customers.data[0]

    if (!customer) {
      return jsonResponse({
        plan: 'basic',
        billing: 'monthly',
        status: 'none',
      })
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 1,
    })
    const subscription = subscriptions.data[0]

    const status = subscription?.status ?? 'none'
    const active =
      status === 'active' || status === 'trialing' || status === 'past_due'

    if (!subscription || !active) {
      return jsonResponse({
        plan: 'basic',
        billing: 'monthly',
        status,
      })
    }

    const plan = (subscription.metadata?.plan as string | undefined) ?? 'basic'
    const billing =
      (subscription.metadata?.billing as string | undefined) ?? 'monthly'

    const supabase = createAdminClient()

    // If a business was supplied, verify the caller belongs to it so we don't
    // attach someone else's entitlement to a row they can't access.
    if (businessId) {
      const { data: member, error: memberError } = await supabase
        .from('business_members')
        .select('user_id')
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
    }

    const { error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: user.id,
          business_id: businessId,
          plan,
          billing,
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          status,
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )

    if (error) {
      console.error('sync-subscription upsert failed:', error)
      return jsonResponse(
        { error: `subscriptions upsert failed: ${error.message}` },
        500,
      )
    }

    return jsonResponse({ plan, billing, status })
  } catch (err) {
    console.error('sync-subscription error:', err)
    const message =
      err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
