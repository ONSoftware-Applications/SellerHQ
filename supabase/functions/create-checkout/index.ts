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
    const priceId = body?.priceId as string | undefined
    const billing = body?.billing as string | undefined

    if (
      !VALID_PLANS.has(plan ?? '') ||
      !VALID_BILLING.has(billing ?? '') ||
      typeof priceId !== 'string' ||
      !priceId.startsWith('price_')
    ) {
      return jsonResponse(
        { error: 'Invalid plan, billing cycle or price' },
        400,
      )
    }

    const origin =
      request.headers.get('Origin') ?? Deno.env.get('APP_URL') ?? ''

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/subscriptions?success=true`,
      cancel_url: `${origin}/subscriptions?cancelled=true`,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan, billing },
      subscription_data: {
        metadata: { user_id: user.id, plan, billing },
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
