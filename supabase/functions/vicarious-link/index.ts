import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-vicarious-api-key, x-sellerhq-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
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

function integrationKey() {
  return Deno.env.get('VICARIOUS_API_KEY') || Deno.env.get('SELLERHQ_API_KEY') || ''
}

function vicariousEndpoint() {
  return Deno.env.get('VICARIOUS_PRODUCTS_ENDPOINT') || 'https://vicariousclothing.co.uk/api/integrations/sellerhq/products'
}

function targetBusinessId() {
  return Deno.env.get('VICARIOUS_BUSINESS_ID') || ''
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function toNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null
}

function databaseStatusToProductStatus(status: string): string {
  switch (status) {
    case 'listed':
      return 'Listed'
    case 'awaiting_shipping':
      return 'Awaiting Shipping'
    case 'in_shipping':
      return 'In Shipping'
    case 'sold':
      return 'Sold'
    case 'reserved':
      return 'Reserved'
    case 'relisting_required':
      return 'Relisting Required'
    case 'issue':
      return 'Issue'
    case 'removed':
      return 'Removed'
    case 'returned':
      return 'Returned'
    case 'archived':
      return 'Archived'
    case 'draft':
      return 'Draft'
    case 'not_listed':
    case 'unlisted':
    default:
      return 'Unlisted'
  }
}

function productStatusToDatabaseStatus(status: string): string {
  switch (status) {
    case 'Listed':
    case 'AVAILABLE':
      return 'listed'
    case 'Awaiting Shipping':
    case 'RESERVED':
      return 'awaiting_shipping'
    case 'In Shipping':
      return 'in_shipping'
    case 'Sold':
    case 'SOLD':
      return 'sold'
    case 'Reserved':
      return 'reserved'
    case 'Relisting Required':
      return 'relisting_required'
    case 'Issue':
      return 'issue'
    case 'Removed':
      return 'removed'
    case 'Returned':
      return 'returned'
    case 'Archived':
    case 'ARCHIVED':
      return 'archived'
    case 'Draft':
    case 'DRAFT':
      return 'draft'
    case 'Unlisted':
    default:
      return 'unlisted'
  }
}

function vicariousCategoryToSellerHq(value: unknown) {
  const raw = clean(value).toLowerCase()
  const table: Record<string, string> = {
    tops: 'Tops',
    trousers: 'Trousers',
    dresses: 'Dresses',
    skirts: 'Skirts',
    shoes: 'Shoes',
    accessories: 'Accessories',
    hoodies: 'Hoodies',
    knitwear: 'Knitwear',
    jackets: 'Jackets',
    jeans: 'Jeans',
    footwear: 'Footwear',
    vintage: 'Vintage',
  }
  return table[raw] ?? clean(value)
}

function vicariousConditionToSellerHq(value: unknown) {
  const raw = clean(value).toLowerCase()
  const table: Record<string, string> = {
    new_with_tags: 'New with tags',
    new_without_tags: 'New',
    excellent: 'Very good',
    very_good: 'Very good',
    good: 'Good',
    fair: 'Satisfactory',
  }
  return table[raw] ?? clean(value)
}

function databaseToSellerHqProduct(row: Record<string, unknown>) {
  const customFields = (row.custom_fields as Record<string, unknown> | null) ?? {}
  return {
    id: row.id,
    businessId: row.business_id,
    code: row.product_reference ?? '',
    sku: row.sku ?? '',
    name: row.name ?? '',
    description: row.description ?? '',
    brand: row.brand ?? '',
    category: row.category ?? '',
    size: row.size ?? '',
    colour: row.colour ?? '',
    condition: row.condition ?? 'Good',
    purchasePrice: Number(row.purchase_price ?? 0),
    purchaseDate: row.purchase_date ?? null,
    purchaseSource: row.purchase_source ?? '',
    quantity: Number(row.quantity ?? 1),
    reorderLevel: Number(row.reorder_level ?? 0),
    storageLocation: row.storage_location ?? '',
    barcode: row.barcode ?? '',
    photos: (row.images as string[] | null) ?? [],
    labels: (row.labels as string[] | null) ?? [],
    customFields,
    status: databaseStatusToProductStatus(String(row.status ?? '')),
    marketplaces: (row.marketplaces as string[] | null) ?? [],
    listingPrice: Number(row.listing_price ?? 0),
    listingDate: row.listing_date ?? null,
    salePrice: row.sale_price === null || row.sale_price === undefined ? null : Number(row.sale_price),
    saleDate: row.sale_date ?? null,
    shippingDate: row.shipping_date ?? null,
    fees: Number(row.fees ?? 0),
    profit: Number(row.profit ?? 0),
    additionalCosts: Number(row.additional_costs ?? 0),
    saleMarketplace: row.sale_marketplace ?? null,
    shippingCost: Number(row.shipping_cost ?? 0),
    platformFees: Number(row.platform_fees ?? 0),
    otherFees: Number(row.other_fees ?? 0),
    refunded: Boolean(row.refunded),
    refundAmount: Number(row.refund_amount ?? 0),
    refundDate: row.refund_date ?? null,
    refundNote: row.refund_note ?? '',
    dateAdded: row.date_added ?? '',
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  }
}

async function getUserFromRequest(request: Request, admin: ReturnType<typeof createAdminClient>) {
  const authHeader = request.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token || token === integrationKey()) return null

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

function hasSharedKey(request: Request) {
  const expected = integrationKey()
  if (!expected) return false
  const supplied =
    request.headers.get('x-vicarious-api-key') ||
    request.headers.get('x-sellerhq-api-key') ||
    ''
  return supplied === expected
}

async function requireBusinessAccess(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  businessId: string,
) {
  const { data, error } = await admin
    .from('business_members')
    .select('id')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

async function logProductEvent(
  admin: ReturnType<typeof createAdminClient>,
  product: Record<string, unknown>,
  eventType: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  await admin.from('product_events').insert({
    product_id: product.id,
    business_id: product.business_id,
    event_type: eventType,
    message,
    metadata: metadata ?? null,
  })
}

async function findProductByCode(admin: ReturnType<typeof createAdminClient>, prdCode: string) {
  const businessId = targetBusinessId()
  let query = admin
    .from('products')
    .select('*')
    .eq('product_reference', prdCode)

  if (businessId) query = query.eq('business_id', businessId)

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data as Record<string, unknown> | null
}

async function publishProductToVicarious(
  admin: ReturnType<typeof createAdminClient>,
  product: Record<string, unknown>,
  publish: boolean,
) {
  const key = integrationKey()
  if (!key) throw new Error('VICARIOUS_API_KEY is not configured')

  const res = await fetch(vicariousEndpoint(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      publish,
      product: databaseToSellerHqProduct(product),
    }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(
      typeof data?.error === 'string'
        ? data.error
        : `Vicarious returned ${res.status}`,
    )
  }

  await logProductEvent(
    admin,
    product,
    'vicarious_synced',
    `Published to Vicarious Clothing${data?.sku ? ` as ${data.sku}` : ''}`,
    { response: data },
  )

  return data as Record<string, unknown>
}

async function handlePublishProduct(
  request: Request,
  body: Record<string, unknown>,
  admin: ReturnType<typeof createAdminClient>,
) {
  const user = await getUserFromRequest(request, admin)
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

  const productId = clean(body.productId)
  if (!productId) return jsonResponse({ error: 'Missing productId' }, 400)

  const { data: product, error } = await admin
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle()

  if (error) throw error
  if (!product) return jsonResponse({ error: 'Product not found' }, 404)

  const canAccess = await requireBusinessAccess(admin, user.id, String(product.business_id))
  if (!canAccess) return jsonResponse({ error: 'Forbidden' }, 403)

  const response = await publishProductToVicarious(
    admin,
    product as Record<string, unknown>,
    body.publish === undefined ? true : Boolean(body.publish),
  )

  return jsonResponse({ ok: true, response })
}

async function handleGetProduct(body: Record<string, unknown>, admin: ReturnType<typeof createAdminClient>) {
  const prdCode = clean(body.prdCode)
  if (!prdCode) return jsonResponse({ error: 'Missing prdCode' }, 400)

  const product = await findProductByCode(admin, prdCode)
  if (!product) return jsonResponse({ error: 'Product not found' }, 404)

  return jsonResponse({ ok: true, product: databaseToSellerHqProduct(product) })
}

async function handleProductUpdateFromVicarious(
  body: Record<string, unknown>,
  admin: ReturnType<typeof createAdminClient>,
) {
  const source = (body.product ?? {}) as Record<string, unknown>
  const prdCode = clean(source.prdCode ?? source.code)
  if (!prdCode) return jsonResponse({ error: 'Missing PRD code' }, 400)

  const product = await findProductByCode(admin, prdCode)
  if (!product) return jsonResponse({ error: 'SellerHQ product not found for PRD code' }, 404)

  const images = Array.isArray(source.images)
    ? source.images
        .map((image) => clean((image as Record<string, unknown>)?.src ?? image))
        .filter(Boolean)
    : undefined

  const marketplace = Array.isArray(source.marketplace)
    ? source.marketplace
        .filter((entry) => (entry as Record<string, unknown>)?.status === 'LISTED')
        .map((entry) => {
          const channel = clean((entry as Record<string, unknown>)?.channel)
          return channel === 'website' ? 'Website' : channel.charAt(0).toUpperCase() + channel.slice(1)
        })
        .filter(Boolean)
    : undefined

  const existingCustomFields = (product.custom_fields as Record<string, unknown> | null) ?? {}
  const updates: Record<string, unknown> = {
    name: clean(source.name) || product.name,
    description: clean(source.description) || product.description,
    brand: clean(source.brand) || product.brand,
    category: clean(source.category) ? vicariousCategoryToSellerHq(source.category) : product.category,
    size: clean(source.size) || product.size,
    colour: clean(source.colour) || product.colour,
    condition: clean(source.condition) ? vicariousConditionToSellerHq(source.condition) : product.condition,
    storage_location: clean(source.location) || product.storage_location,
    listing_price: toNumber(source.price) ?? product.listing_price,
    purchase_price: toNumber(source.cost) ?? product.purchase_price,
    purchase_date: clean(source.purchaseDate) || product.purchase_date,
    purchase_source: clean(source.acquisitionSource) || product.purchase_source,
    status: productStatusToDatabaseStatus(clean(source.status)),
    marketplaces: marketplace ?? product.marketplaces,
    images: images ?? product.images,
    custom_fields: {
      ...existingCustomFields,
      material: clean(source.material) || existingCustomFields.material || '',
      conditionNotes: clean(source.conditionNotes) || existingCustomFields.conditionNotes || '',
      defects: Array.isArray(source.defects) ? source.defects : existingCustomFields.defects,
      tags: Array.isArray(source.tags) ? source.tags : existingCustomFields.tags,
      vicariousSku: clean(source.sku) || existingCustomFields.vicariousSku,
      vicariousSlug: clean(source.slug) || existingCustomFields.vicariousSlug,
      vicariousLastSyncReason: clean(body.reason),
      vicariousLastSyncedAt: new Date().toISOString(),
    },
  }

  const { data, error } = await admin
    .from('products')
    .update(updates)
    .eq('id', product.id)
    .select('*')
    .single()

  if (error) throw error

  await logProductEvent(
    admin,
    data as Record<string, unknown>,
    'vicarious_updated_sellerhq',
    `Updated from Vicarious Clothing${clean(body.reason) ? ` (${clean(body.reason)})` : ''}`,
    { vicariousProduct: source },
  )

  return jsonResponse({ ok: true, product: databaseToSellerHqProduct(data as Record<string, unknown>) })
}

async function handleRecordSale(body: Record<string, unknown>, admin: ReturnType<typeof createAdminClient>) {
  const order = (body.order ?? {}) as Record<string, unknown>
  const items = Array.isArray(order.items) ? order.items : []
  const updated: Array<Record<string, unknown>> = []

  for (const item of items) {
    const sku = clean((item as Record<string, unknown>).sku)
    if (!sku) continue

    let product: Record<string, unknown> | null = null
    const businessId = targetBusinessId()
    let byVicariousSku = admin
      .from('products')
      .select('*')
      .eq('custom_fields->>vicariousSku', sku)
    if (businessId) byVicariousSku = byVicariousSku.eq('business_id', businessId)

    const firstLookup = await byVicariousSku.maybeSingle()
    if (firstLookup.error) throw firstLookup.error
    product = firstLookup.data as Record<string, unknown> | null

    if (!product) {
      let bySku = admin.from('products').select('*').eq('sku', sku)
      if (businessId) bySku = bySku.eq('business_id', businessId)
      const secondLookup = await bySku.maybeSingle()
      if (secondLookup.error) throw secondLookup.error
      product = secondLookup.data as Record<string, unknown> | null
    }

    if (!product) continue

    const price = toNumber((item as Record<string, unknown>).price) ?? toNumber(order.total) ?? 0
    const existingCustomFields = (product.custom_fields as Record<string, unknown> | null) ?? {}
    const { data, error } = await admin
      .from('products')
      .update({
        status: 'awaiting_shipping',
        sale_price: price,
        sale_date: clean(order.createdAt) || new Date().toISOString().split('T')[0],
        sale_marketplace: 'Website',
        custom_fields: {
          ...existingCustomFields,
          vicariousOrderId: clean(order.id),
          vicariousPaymentProvider: clean(order.paymentProvider),
          vicariousPaymentIntentId: clean(order.paymentIntentId),
          vicariousSaleSyncedAt: new Date().toISOString(),
        },
      })
      .eq('id', product.id)
      .select('*')
      .single()

    if (error) throw error

    await logProductEvent(
      admin,
      data as Record<string, unknown>,
      'vicarious_sale_recorded',
      `Website sale recorded from Vicarious order ${clean(order.id)}`,
      { order, item },
    )
    updated.push(databaseToSellerHqProduct(data as Record<string, unknown>))
  }

  return jsonResponse({ ok: true, updatedCount: updated.length, products: updated })
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const admin = createAdminClient()

  try {
    const body = await request.json() as Record<string, unknown>
    const action = clean(body.action)

    const sharedActions = new Set([
      'get_product',
      'product_update_from_vicarious',
      'record_sale',
    ])

    if (sharedActions.has(action) && !hasSharedKey(request)) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    switch (action) {
      case 'publish_product':
        return await handlePublishProduct(request, body, admin)
      case 'get_product':
        return await handleGetProduct(body, admin)
      case 'product_update_from_vicarious':
        return await handleProductUpdateFromVicarious(body, admin)
      case 'record_sale':
        return await handleRecordSale(body, admin)
      default:
        return jsonResponse({ error: 'Unknown action' }, 400)
    }
  } catch (error) {
    console.error('vicarious-link error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
