import Stripe from 'npm:stripe@16'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabaseAdmin.ts'

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) {
    return jsonResponse({ error: 'STRIPE_SECRET_KEY is not configured' }, 500)
  }

  try {
    const { user, error: authError } = await getUserFromRequest(request)
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const supabase = createAdminClient()
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!subscription?.stripe_customer_id) {
      return jsonResponse(
        { error: 'No billing customer found for this account' },
        400,
      )
    }

    const origin =
      request.headers.get('Origin') ?? Deno.env.get('APP_URL') ?? ''

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
