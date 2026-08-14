export type ProductStatus =
  | 'Unlisted'
  | 'Listed'
  | 'Awaiting Shipping'
  | 'In Shipping'
  | 'Sold'
  | 'Reserved'
  | 'Relisting Required'
  | 'Issue'
  | 'Removed'
  | 'Returned'
  | 'Archived'
  | 'Draft'

export type Marketplace =
  | 'eBay'
  | 'Vinted'
  | 'Etsy'
  | 'Depop'
  | 'In Store'

export type ProductCondition =
  | 'New'
  | 'New with tags'
  | 'Very good'
  | 'Good'
  | 'Satisfactory'
  | 'For parts / not working'

export type Product = {
  id: string
  businessId: string

  code: string
  sku: string

  name: string
  description: string
  brand: string
  category: string
  size: string
  colour: string
  condition: ProductCondition

  purchasePrice: number
  purchaseDate: string | null
  purchaseSource: string

  quantity: number
  reorderLevel: number

  storageLocation: string
  barcode: string
  photos: string[]
  labels: string[]
  customFields: Record<string, string>

  status: ProductStatus

  marketplaces: Marketplace[]
  listingPrice: number
  listingDate: string | null

  salePrice: number | null
  saleDate: string | null
  shippingDate: string | null
  fees: number
  profit: number

  additionalCosts: number
  saleMarketplace: Marketplace | null
  shippingCost: number
  platformFees: number
  otherFees: number

  refunded: boolean
  refundAmount: number
  refundDate: string | null
  refundNote: string

  dateAdded: string
  createdAt: string
  updatedAt: string
}

export type ProductRow = {
  id: string
  business_id: string

  product_reference: string | null
  sku: string | null

  name: string
  description: string | null
  brand: string | null
  category: string | null
  size: string | null
  colour: string | null
  condition: string | null

  purchase_price: number | null
  purchase_date: string | null
  purchase_source: string | null

  quantity: number | null
  reorder_level: number | null

  storage_location: string | null
  barcode: string | null
  images: string[] | null
  labels: string[] | null
  custom_fields: Record<string, unknown> | null

  status: string | null

  marketplaces: string[] | null
  listing_price: number | null
  listing_date: string | null

  sale_price: number | null
  sale_date: string | null
  shipping_date: string | null
  fees: number | null
  profit: number | null

  additional_costs: number | null
  sale_marketplace: string | null
  shipping_cost: number | null
  platform_fees: number | null
  other_fees: number | null

  refunded: boolean | null
  refund_amount: number | null
  refund_date: string | null
  refund_note: string | null

  date_added: string | null
  created_at: string | null
  updated_at: string | null
}

export type ProductDraft = Omit<Product, 'businessId'>

export type ProductEvent = {
  id: string
  productId: string
  eventType: string
  message: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

export type ProductEventRow = {
  id: string
  product_id: string
  event_type: string
  message: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
}

export type Relisting = {
  id: string
  productId: string
  marketplace: string | null
  previousPrice: number | null
  newPrice: number | null
  relistedAt: string
}

export type RelistingRow = {
  id: string
  product_id: string
  marketplace: string | null
  previous_price: number | null
  new_price: number | null
  relisted_at: string | null
}
