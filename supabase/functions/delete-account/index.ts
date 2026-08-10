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

// Best-effort removal of every file inside a storage folder.
async function removeFolderContents(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  folder: string,
): Promise<void> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, { limit: 1000 })
    if (error || !data) return
    const paths = data
      .filter((entry) => entry.id)
      .map((entry) => `${folder}/${entry.name}`)
    for (let i = 0; i < paths.length; i += 100) {
      await supabase.storage.from(bucket).remove(paths.slice(i, i + 100))
    }
  } catch (err) {
    console.error(`Failed to clean up storage folder ${bucket}/${folder}:`, err)
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user } = await getUserFromRequest(request)
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }
    const userId = user.id
    const supabase = createAdminClient()

    // Cancel any active Stripe subscriptions so the user is not billed
    // after their account is deleted. Best effort - billing may be absent.
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (stripeKey && user.email) {
      try {
        const stripe = new Stripe(stripeKey)
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 1,
        })
        const customer = customers.data[0]
        if (customer) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            limit: 100,
          })
          for (const subscription of subscriptions.data) {
            if (
              subscription.status === 'active' ||
              subscription.status === 'trialing' ||
              subscription.status === 'past_due'
            ) {
              await stripe.subscriptions.cancel(subscription.id)
            }
          }
        }
      } catch (err) {
        console.error('Failed to cancel Stripe subscriptions:', err)
      }
    }

    // Identify the businesses the user owns and their products so we can
    // remove stored photos before the rows are deleted.
    const { data: ownedBusinesses } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', userId)
    const businessIds = (ownedBusinesses ?? []).map((business) => business.id)

    let productIds: string[] = []
    if (businessIds.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .in('business_id', businessIds)
      productIds = (products ?? []).map((product) => product.id)
    }

    for (const id of productIds) {
      await removeFolderContents(supabase, 'products', id)
    }
    for (const id of businessIds) {
      await removeFolderContents(supabase, 'business-assets', id)
    }

    // Receipts are stored under the user's own folder in the receipts bucket.
    await removeFolderContents(supabase, 'receipts', userId)

    // Delete owned businesses. FKs cascade to products, expenses, members,
    // product events, relistings, invite codes and audit logs.
    if (businessIds.length > 0) {
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('owner_id', userId)
      if (error) {
        console.error('Failed to delete businesses:', error)
        return jsonResponse(
          { error: `Failed to delete businesses: ${error.message}` },
          500,
        )
      }
    }

    // Remove memberships in businesses the user does not own.
    const { error: memberError } = await supabase
      .from('business_members')
      .delete()
      .eq('user_id', userId)
    if (memberError) {
      console.error('Failed to delete memberships:', memberError)
      return jsonResponse(
        { error: `Failed to delete memberships: ${memberError.message}` },
        500,
      )
    }

    // Delete the auth user. Remaining rows (settings, subscriptions, audit
    // logs) reference auth.users with ON DELETE CASCADE.
    const { error: userError } = await supabase.auth.admin.deleteUser(userId)
    if (userError) {
      console.error('Failed to delete user:', userError)
      return jsonResponse(
        { error: `Failed to delete user: ${userError.message}` },
        500,
      )
    }

    return jsonResponse({ deleted: true })
  } catch (err) {
    console.error('delete-account error:', err)
    const message =
      err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
