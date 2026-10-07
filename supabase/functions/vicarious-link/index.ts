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

function dateOnly(value: unknown) {
  const text = clean(value)
  if (!text) return new Date().toISOString().split('T')[0]
  return text.includes('T') ? text.split('T')[0] : text
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

function sellerHqStatusFromVicariousOrder(status: unknown): string {
  switch (clean(status).toUpperCase()) {
    case 'DISPATCHED':
      return 'in_shipping'
    case 'DELIVERED':
      return 'sold'
    case 'PAID':
    case 'PICKING':
    case 'READY_TO_DISPATCH':
    default:
      return 'awaiting_shipping'
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

function projectedProfit(row: Record<string, unknown>, listingPrice: unknown) {
  const listing = toNumber(listingPrice) ?? Number(row.listing_price ?? 0)
  const purchase = Number(row.purchase_price ?? 0)
  const additional = Number(row.additional_costs ?? 0)
  return Math.round((listing - purchase - additional) * 100) / 100
}

function withoutVicariousSaleFields(fields: Record<string, unknown>) {
  const next = { ...fields }
  delete next.vicariousOrderId
  delete next.vicariousOrderStatus
  delete next.vicariousPaymentProvider
  delete next.vicariousPaymentIntentId
  delete next.vicariousSaleSyncedAt
  return next
}

function isRelistFromVicarious(body: Record<string, unknown>, source: Record<string, unknown>) {
  const reason = clean(body.reason).toLowerCase()
  const status = clean(source.status).toUpperCase()
  return reason.includes('relist') || status === 'AVAILABLE' || status === 'LISTED'
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

  const relisted = isRelistFromVicarious(body, source)
  const existingCustomFields = (product.custom_fields as Record<string, unknown> | null) ?? {}
  const baseCustomFields = relisted ? withoutVicariousSaleFields(existingCustomFields) : existingCustomFields
  const listingPrice = toNumber(source.price) ?? product.listing_price

  const updates: Record<string, unknown> = {
    name: clean(source.name) || product.name,
    description: clean(source.description) || product.description,
    brand: clean(source.brand) || product.brand,
    category: clean(source.category) ? vicariousCategoryToSellerHq(source.category) : product.category,
    size: clean(source.size) || product.size,
    colour: clean(source.colour) || product.colour,
    condition: clean(source.condition) ? vicariousConditionToSellerHq(source.condition) : product.condition,
    storage_location: clean(source.location) || product.storage_location,
    listing_price: listingPrice,
    purchase_price: toNumber(source.cost) ?? product.purchase_price,
    purchase_date: clean(source.purchaseDate) || product.purchase_date,
    purchase_source: clean(source.acquisitionSource) || product.purchase_source,
    status: productStatusToDatabaseStatus(clean(source.status)),
    marketplaces: marketplace ?? product.marketplaces,
    images: images ?? product.images,
    custom_fields: {
      ...baseCustomFields,
      material: clean(source.material) || baseCustomFields.material || '',
      conditionNotes: clean(source.conditionNotes) || baseCustomFields.conditionNotes || '',
      defects: Array.isArray(source.defects) ? source.defects : baseCustomFields.defects,
      tags: Array.isArray(source.tags) ? source.tags : baseCustomFields.tags,
      vicariousSku: clean(source.sku) || baseCustomFields.vicariousSku,
      vicariousSlug: clean(source.slug) || baseCustomFields.vicariousSlug,
      vicariousLastSyncReason: clean(body.reason),
      vicariousLastSyncedAt: new Date().toISOString(),
    },
  }

  if (relisted) {
    updates.status = 'listed'
    updates.sale_price = null
    updates.sale_date = null
    updates.shipping_date = null
    updates.sale_marketplace = null
    updates.shipping_cost = 0
    updates.platform_fees = 0
    updates.other_fees = 0
    updates.fees = 0
    updates.profit = projectedProfit(product, listingPrice)
    updates.refunded = false
    updates.refund_amount = 0
    updates.refund_date = null
    updates.refund_note = ''
    updates.listing_date = dateOnly(source.updatedAt)
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
    relisted ? 'vicarious_relisted_sellerhq' : 'vicarious_updated_sellerhq',
    relisted
      ? `Relisted from Vicarious Clothing; sale fields cleared`
      : `Updated from Vicarious Clothing${clean(body.reason) ? ` (${clean(body.reason)})` : ''}`,
    { vicariousProduct: source },
  )

  return jsonResponse({ ok: true, product: databaseToSellerHqProduct(data as Record<string, unknown>) })
}

async function handleRecordSale(body: Record<string, unknown>, admin: ReturnType<typeof createAdminClient>) {
  const order = (body.order ?? {}) as Record<string, unknown>
  const items = Array.isArray(order.items) ? order.items : []
  const sellerHqStatus = sellerHqStatusFromVicariousOrder(order.status)
  const updated: Array<Record<string, unknown>> = []

  for (const rawItem of items) {
    const item = rawItem as Record<string, unknown>
    const sku = clean(item.sku)
    if (!sku) continue

    let product: Record<string, unknown> | null = null
    const configuredBusinessId = targetBusinessId()
    let byVicariousSku = admin
      .from('products')
      .select('*')
      .eq('custom_fields->>vicariousSku', sku)
    if (configuredBusinessId) {
      byVicariousSku = byVicariousSku.eq('business_id', configuredBusinessId)
    }

    const firstLookup = await byVicariousSku.maybeSingle()
    if (firstLookup.error) throw firstLookup.error
    product = firstLookup.data as Record<string, unknown> | null

    if (!product) {
      let bySku = admin.from('products').select('*').eq('sku', sku)
      if (configuredBusinessId) {
        bySku = bySku.eq('business_id', configuredBusinessId)
      }
      const secondLookup = await bySku.maybeSingle()
      if (secondLookup.error) throw secondLookup.error
      product = secondLookup.data as Record<string, unknown> | null
    }

    if (!product) continue

    const businessId = clean(product.business_id)
    const quantity = Math.max(1, Math.floor(toNumber(item.quantity) ?? 1))
    const explicitLineTotal =
      toNumber(item.lineTotal)
      ?? toNumber(item.line_total)
      ?? toNumber(item.total)
    const price =
      explicitLineTotal
      ?? toNumber(item.price)
      ?? toNumber(order.total)
      ?? 0
    const orderId = clean(order.id)
    const externalReference = `${orderId || 'order'}:${sku}`

    const existingSaleResult = await admin
      .from('product_sales')
      .select('*')
      .eq('business_id', businessId)
      .eq('source', 'vicarious')
      .eq('external_reference', externalReference)
      .maybeSingle()

    if (
      existingSaleResult.error
      && existingSaleResult.error.code !== '42P01'
      && existingSaleResult.error.code !== 'PGRST205'
    ) {
      throw existingSaleResult.error
    }

    const existingSale =
      existingSaleResult.data as Record<string, unknown> | null

    if (existingSale) {
      const salePatch: Record<string, unknown> = {
        status: sellerHqStatus,
        updated_at: new Date().toISOString(),
      }
      if (sellerHqStatus === 'in_shipping' || sellerHqStatus === 'sold') {
        salePatch.shipping_date =
          clean(existingSale.shipping_date)
          || dateOnly(order.updatedAt)
          || dateOnly(order.createdAt)
      }

      const { error: saleUpdateError } = await admin
        .from('product_sales')
        .update(salePatch)
        .eq('id', existingSale.id)

      if (saleUpdateError) throw saleUpdateError
    } else {
      const { error: saleError } = await admin.rpc(
        'record_product_sale',
        {
          p_product_id: product.id,
          p_quantity: quantity,
          p_sale_price: price,
          p_sale_date: dateOnly(order.createdAt),
          p_sale_marketplace: 'Website',
          p_shipping_cost: 0,
          p_platform_fees: 0,
          p_other_fees: 0,
          p_sale_status: sellerHqStatus,
          p_source: 'vicarious',
          p_external_reference: externalReference,
          p_till_transaction_id: null,
        },
      )

      if (saleError) {
        const ledgerUnavailable =
          saleError.code === '42883'
          || saleError.code === 'PGRST202'
          || saleError.code === '42P01'

        if (!ledgerUnavailable) throw saleError

        // Backward-compatible fallback until the ledger migration is applied.
        const remainingQuantity = Math.max(
          0,
          Number(product.quantity ?? 1) - quantity,
        )
        const purchasePrice = Number(product.purchase_price ?? 0)
        const additionalCosts = Number(product.additional_costs ?? 0)
        const profit =
          price - ((purchasePrice + additionalCosts) * quantity)

        const { error: fallbackError } = await admin
          .from('products')
          .update({
            quantity: remainingQuantity,
            status:
              remainingQuantity > 0
                ? product.status
                : sellerHqStatus,
            sale_price: price,
            sale_date: dateOnly(order.createdAt),
            sale_marketplace: 'Website',
            fees: 0,
            profit,
          })
          .eq('id', product.id)

        if (fallbackError) throw fallbackError
      }
    }

    const latestProductResult = await admin
      .from('products')
      .select('*')
      .eq('id', product.id)
      .single()

    if (latestProductResult.error) throw latestProductResult.error
    const latestProduct =
      latestProductResult.data as Record<string, unknown>
    const existingCustomFields =
      (latestProduct.custom_fields as Record<string, unknown> | null) ?? {}

    const productPatch: Record<string, unknown> = {
      custom_fields: {
        ...existingCustomFields,
        vicariousOrderId: orderId,
        vicariousOrderStatus: clean(order.status),
        vicariousPaymentProvider: clean(order.paymentProvider),
        vicariousPaymentIntentId: clean(order.paymentIntentId),
        vicariousCarrier: clean(order.carrier),
        vicariousTracking: clean(order.tracking),
        vicariousSaleSyncedAt: new Date().toISOString(),
      },
    }

    if (Number(latestProduct.quantity ?? 0) === 0) {
      productPatch.status = sellerHqStatus
      if (sellerHqStatus === 'in_shipping' || sellerHqStatus === 'sold') {
        productPatch.shipping_date =
          clean(latestProduct.shipping_date)
          || dateOnly(order.updatedAt)
      }
    }

    const { data, error } = await admin
      .from('products')
      .update(productPatch)
      .eq('id', product.id)
      .select('*')
      .single()

    if (error) throw error

    await logProductEvent(
      admin,
      data as Record<string, unknown>,
      sellerHqStatus === 'awaiting_shipping'
        ? 'vicarious_sale_recorded'
        : 'vicarious_fulfilment_updated',
      sellerHqStatus === 'awaiting_shipping'
        ? `Website sale recorded from Vicarious order ${orderId}`
        : `Vicarious order ${orderId} updated fulfilment to ${databaseStatusToProductStatus(sellerHqStatus)}`,
      { order, item, quantity },
    )

    updated.push(
      databaseToSellerHqProduct(data as Record<string, unknown>),
    )
  }

  return jsonResponse({
    ok: true,
    updatedCount: updated.length,
    products: updated,
  })
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
