import Stripe from 'npm:stripe@16'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

async function upsertSubscription(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      { user_id: userId, ...patch, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  if (error) {
    console.error('Failed to upsert subscription:', error)
  }
}

async function handleSubscription(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription,
) {
  const userId = asString(subscription.metadata?.user_id)
  const plan = asString(subscription.metadata?.plan)
  if (!userId || !plan) return

  const customerId = asString(subscription.customer) ?? undefined
  const billing =
    asString(subscription.metadata?.billing) ?? 'monthly'

  await upsertSubscription(supabase, userId, {
    plan,
    billing,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    status: subscription.status,
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
  })
}

Deno.serve(async (request: Request) => {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!stripeKey || !webhookSecret) {
    return new Response('Stripe is not configured', { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  const rawBody = await request.text()
  const stripe = new Stripe(stripeKey)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = asString(session.metadata?.user_id)
      const plan = asString(session.metadata?.plan)
      const billing = asString(session.metadata?.billing) ?? 'monthly'
      const subscriptionId = asString(session.subscription)
      const customerId = asString(session.customer)

      if (userId && plan && subscriptionId) {
        await upsertSubscription(supabase, userId, {
          plan,
          billing,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          status: 'active',
        })
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      await handleSubscription(supabase, subscription)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = asString(subscription.metadata?.user_id)
      if (userId) {
        await upsertSubscription(supabase, userId, {
          status: 'canceled',
          cancel_at_period_end: false,
          stripe_subscription_id: subscription.id,
        })
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = asString(invoice.subscription)
      if (subscriptionId) {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId)
        if (error) console.error('Failed to mark subscription past_due:', error)
      }
      break
    }

    default:
      break
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
