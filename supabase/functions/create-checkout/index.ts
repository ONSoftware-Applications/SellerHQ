import Stripe from 'npm:stripe@16'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { getUserFromRequest } from '../_shared/supabaseAdmin.ts'

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
    const { user, error: authError } = await getUserFromRequest(request)
    if (authError || !user) {
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
    return jsonResponse({ error: 'Internal error' }, 500)
  }
})
