import Stripe from 'npm:stripe@22'
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

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

// Idempotency: record the Stripe event ID first. If it already exists, the
// event was processed (or is a duplicate delivery) and should be skipped.
async function isDuplicateEvent(
  supabase: ReturnType<typeof createAdminClient>,
  eventId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle()

  if (error) {
    throw new Error(`stripe_events select failed: ${error.message}`)
  }

  return data !== null
}

async function recordEvent(
  supabase: ReturnType<typeof createAdminClient>,
  eventId: string,
  type: string,
) {
  const { error } = await supabase
    .from('stripe_events')
    .insert({ id: eventId, type })
  if (error) {
    throw new Error(`stripe_events insert failed: ${error.message}`)
  }
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
    throw new Error(`subscriptions upsert failed: ${error.message}`)
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
  const billing = asString(subscription.metadata?.billing) ?? 'monthly'
  const businessId = asString(subscription.metadata?.business_id)

  await upsertSubscription(supabase, userId, {
    plan,
    billing,
    business_id: businessId ?? null,
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

  try {
    // Idempotency guard: dedupe before doing any work.
    if (await isDuplicateEvent(supabase, event.id)) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = asString(session.metadata?.user_id)
      const plan = asString(session.metadata?.plan)
      const billing = asString(session.metadata?.billing) ?? 'monthly'
      const businessId = asString(session.metadata?.business_id)
      const subscriptionId = asString(session.subscription)
      const customerId = asString(session.customer)

      if (userId && plan && subscriptionId) {
        await upsertSubscription(supabase, userId, {
          plan,
          billing,
          business_id: businessId ?? null,
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
        if (error) {
          console.error('Failed to mark subscription past_due:', error)
        }
      }
      break
    }

    default:
      break
    }

    // Only record the event as processed once the switch succeeded.
    await recordEvent(supabase, event.id, event.type)
  } catch (err) {
    console.error('Webhook handling error:', err)
    const message =
      err instanceof Error ? err.message : 'Unknown webhook error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
