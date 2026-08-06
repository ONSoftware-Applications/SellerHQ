import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useSubscription } from '../hooks/useSubscription'
import { getPlan } from '../lib/plans'
import { logAudit } from '../lib/audit'
import { ProductContext } from '../hooks/useProducts'

import type {
  Marketplace,
  Product,
  ProductCondition,
  ProductDraft,
  ProductEvent,
  ProductEventRow,
  ProductRow,
  ProductStatus,
  RelistingRow,
  Relisting,
} from '../types/product'

function calculateProfit({
  salePrice,
  purchasePrice,
  additionalCosts,
  fees,
}: {
  salePrice: number | null
  purchasePrice: number
  additionalCosts: number
  fees: number
}) {
  if (salePrice === null) {
    return 0
  }

  return salePrice - purchasePrice - additionalCosts - fees
}

function databaseToProduct(row: ProductRow): Product {
  const fees = Number(
    row.fees ??
      (row.shipping_cost ?? 0) +
        (row.platform_fees ?? 0) +
        (row.other_fees ?? 0),
  )

  const salePrice =
    row.sale_price === null || row.sale_price === undefined
      ? null
      : Number(row.sale_price)

  const purchasePrice = Number(row.purchase_price ?? 0)
  const additionalCosts = Number(
    row.additional_costs ?? 0,
  )

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
    condition: (row.condition ?? 'Good') as ProductCondition,

    purchasePrice,
    purchaseDate: row.purchase_date ?? null,
    purchaseSource: row.purchase_source ?? '',
    quantity: Number(row.quantity ?? 1),
    reorderLevel: Number(row.reorder_level ?? 0),

    storageLocation: row.storage_location ?? '',
    barcode: row.barcode ?? '',
    photos: (row.images ?? []) as string[],
    labels: (row.labels ?? []) as string[],

    status: databaseStatusToProductStatus(row.status ?? ''),

    marketplaces: (row.marketplaces ?? []) as Marketplace[],
    listingPrice: Number(row.listing_price ?? 0),
    listingDate: row.listing_date ?? null,

    salePrice,
    saleDate: row.sale_date ?? null,
    shippingDate: row.shipping_date ?? null,
    fees,
    profit: Number(
      row.profit ??
        calculateProfit({
          salePrice,
          purchasePrice,
          additionalCosts,
          fees,
        }),
    ),

    additionalCosts,
    saleMarketplace:
      (row.sale_marketplace as Marketplace | null) ?? null,
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

function databaseStatusToProductStatus(
  status: string,
): ProductStatus {
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

function productStatusToDatabaseStatus(
  status: ProductStatus,
): string {
  switch (status) {
    case 'Listed':
      return 'listed'

    case 'Awaiting Shipping':
      return 'awaiting_shipping'

    case 'In Shipping':
      return 'in_shipping'

    case 'Sold':
      return 'sold'

    case 'Reserved':
      return 'reserved'

    case 'Relisting Required':
      return 'relisting_required'

    case 'Removed':
      return 'removed'

    case 'Returned':
      return 'returned'

    case 'Archived':
      return 'archived'

    case 'Draft':
      return 'draft'

    case 'Unlisted':
    default:
      return 'unlisted'
  }
}

function productToDatabase(product: Product) {
  const fees = Number(product.fees ?? 0)
  const profit = calculateProfit({
    salePrice: product.salePrice,
    purchasePrice: product.purchasePrice,
    additionalCosts: product.additionalCosts,
    fees,
  })

  return {
    business_id: product.businessId,
    product_reference: product.code,
    sku: product.sku,

    name: product.name,
    description: product.description || null,
    brand: product.brand || null,
    category: product.category || null,
    size: product.size || null,
    colour: product.colour || null,
    condition: product.condition || null,

    purchase_price: product.purchasePrice,
    purchase_date: product.purchaseDate || null,
    purchase_source: product.purchaseSource || null,
    quantity: product.quantity,
    reorder_level: product.reorderLevel,

    storage_location: product.storageLocation || null,
    barcode: product.barcode || null,
    images: product.photos,
    labels: product.labels || [],

    status: productStatusToDatabaseStatus(product.status),

    marketplaces: product.marketplaces,
    listing_price: product.listingPrice,
    listing_date: product.listingDate || null,

    sale_price: product.salePrice,
    sale_date: product.saleDate || null,
    shipping_date: product.shippingDate || null,
    fees,
    profit,

    additional_costs: product.additionalCosts,
    sale_marketplace: product.saleMarketplace,
    shipping_cost: product.shippingCost,
    platform_fees: product.platformFees,
    other_fees: product.otherFees,

    refunded: product.refunded,
    refund_amount: product.refundAmount,
    refund_date: product.refundDate,
    refund_note: product.refundNote,

    date_added: product.dateAdded,
  }
}

export function ProductProvider({
  children,
}: {
  children: ReactNode
}) {
  const { currentBusiness } = useBusiness()
  const { plan, productLimit } = useSubscription()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const refreshProducts = useCallback(async () => {
    if (!currentBusiness) {
      setProducts([])
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', currentBusiness.id)
      .order('created_at', {
        ascending: false,
      })

    if (error) {
      console.error('Failed to load products:', error)

      setProducts([])
      setLoading(false)
      return
    }

    setProducts((data ?? []).map(databaseToProduct))

    setLoading(false)
  }, [currentBusiness])

  const logEvent = useCallback(
    async (
      productId: string,
      eventType: string,
      message: string,
      metadata?: Record<string, unknown>,
    ) => {
      if (!currentBusiness) return
      const { error } = await supabase.from('product_events').insert({
        product_id: productId,
        business_id: currentBusiness.id,
        event_type: eventType,
        message,
        metadata: metadata ?? null,
      })
      if (error) console.error('Failed to log product event:', error)
    },
    [currentBusiness],
  )

  const fetchEvents = useCallback(async (productId: string) => {
    const { data, error } = await supabase
      .from('product_events')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load product events:', error)
      return []
    }
    return (data as ProductEventRow[]).map((row) => ({
      id: row.id,
      productId: row.product_id,
      eventType: row.event_type,
      message: row.message ?? '',
      metadata: row.metadata,
      createdAt: row.created_at ?? '',
    })) satisfies ProductEvent[]
  }, [])

  const addRelisting = useCallback(
    async (
      productId: string,
      relisting: {
        marketplace?: string | null
        previousPrice?: number | null
        newPrice?: number | null
      },
    ) => {
      if (!currentBusiness) return
      const { error } = await supabase.from('relistings').insert({
        product_id: productId,
        business_id: currentBusiness.id,
        marketplace: relisting.marketplace ?? null,
        previous_price: relisting.previousPrice ?? null,
        new_price: relisting.newPrice ?? null,
      })
      if (error) console.error('Failed to record relisting:', error)
    },
    [currentBusiness],
  )

  const fetchRelistings = useCallback(async (productId: string) => {
    const { data, error } = await supabase
      .from('relistings')
      .select('*')
      .eq('product_id', productId)
      .order('relisted_at', { ascending: false })

    if (error) {
      console.error('Failed to load relistings:', error)
      return []
    }
    return (data as RelistingRow[]).map((row) => ({
      id: row.id,
      productId: row.product_id,
      marketplace: row.marketplace,
      previousPrice: row.previous_price,
      newPrice: row.new_price,
      relistedAt: row.relisted_at ?? '',
    })) satisfies Relisting[]
  }, [])

  const addProduct = useCallback(async (product: ProductDraft) => {
    if (!currentBusiness) {
      throw new Error(
        'No business is currently selected.',
      )
    }

    if (products.length >= productLimit) {
      throw new Error(
        `Your ${getPlan(plan).name} plan includes up to ${productLimit} products. Upgrade to add more.`,
      )
    }

    const productForBusiness = {
      ...product,
      businessId: currentBusiness.id,
    }

    const { data, error } = await supabase
      .from('products')
      .insert(productToDatabase(productForBusiness))
      .select()
      .single()

    if (error) {
      console.error('Failed to add product:', error)
      throw error
    }

    setProducts((current) => [
      databaseToProduct(data),
      ...current,
    ])

    void logEvent(data.id, 'product_created', `Product added`, {
      name: product.name,
      code: product.code,
    })
    void logAudit(
      'product.created',
      { name: product.name, code: product.code },
      currentBusiness.id,
    )

    // Log marketplace listings if any
    if (product.marketplaces.length > 0) {
      for (const mp of product.marketplaces) {
        void logEvent(data.id, 'marketplace_added', `Listed on ${mp}`, {
          marketplace: mp,
          listingPrice: product.listingPrice,
          listingDate: product.listingDate,
        })
      }
    }
  }, [currentBusiness, logEvent, plan, productLimit, products])

  const updateProduct = useCallback(
    async (product: Product) => {
      const previous = products.find((p) => p.id === product.id)
      const { data, error } = await supabase
        .from('products')
        .update(productToDatabase(product))
        .eq('id', product.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update product:', error)
        throw error
      }

      setProducts((current) =>
        current.map((existingProduct) =>
          existingProduct.id === product.id
            ? databaseToProduct(data)
            : existingProduct,
        ),
      )

      if (previous && previous.status !== product.status) {
        void logEvent(
          product.id,
          'status_changed',
          `Status changed ${previous.status} → ${product.status}`,
          { from: previous.status, to: product.status },
        )
      }

      if (
        previous &&
        previous.listingPrice !== product.listingPrice
      ) {
        void logEvent(
          product.id,
          'price_changed',
          `Listing price ${previous.listingPrice} → ${product.listingPrice}`,
          {
            from: previous.listingPrice,
            to: product.listingPrice,
          },
        )
      }

      if (currentBusiness) {
        void logAudit(
          'product.updated',
          { name: product.name, code: product.code, status: product.status },
          currentBusiness.id,
        )
      }
    },
    [products, logEvent, currentBusiness],
  )

  const deleteProduct = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete product:', error)
      throw error
    }

    setProducts((current) =>
      current.filter((product) => product.id !== id),
    )

    const deleted = products.find((p) => p.id === id)
    if (currentBusiness) {
      void logAudit(
        'product.deleted',
        { name: deleted?.name, code: deleted?.code },
        currentBusiness.id,
      )
    }
  }, [products, currentBusiness])

  const getProduct = useCallback((id: string) => {
    return products.find((product) => product.id === id)
  }, [products])

  useEffect(() => {
    refreshProducts()
  }, [refreshProducts])

  const value = useMemo(
    () => ({
      products,
      loading,
      addProduct,
      updateProduct,
      deleteProduct,
      getProduct,
      refreshProducts,
      logEvent,
      fetchEvents,
      addRelisting,
      fetchRelistings,
    }),
    [
      products,
      loading,
      addProduct,
      updateProduct,
      deleteProduct,
      getProduct,
      refreshProducts,
      logEvent,
      fetchEvents,
      addRelisting,
      fetchRelistings,
    ],
  )

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  )
}


