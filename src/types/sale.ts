import type { Marketplace, Product } from './product'

export type SaleStatus =
  | 'Awaiting Shipping'
  | 'In Shipping'
  | 'Sold'
  | 'Refunded'
  | 'Voided'

export type SaleSource =
  | 'manual'
  | 'bundle'
  | 'till'
  | 'vicarious'
  | 'legacy'
  | string

export type Sale = {
  id: string
  businessId: string
  productId: string | null

  productCode: string
  sku: string
  productName: string
  brand: string
  category: string

  quantity: number
  unitSalePrice: number
  salePrice: number
  unitPurchasePrice: number
  costOfGoods: number
  additionalCosts: number

  shippingCost: number
  platformFees: number
  otherFees: number
  fees: number
  profit: number

  saleDate: string
  shippingDate: string | null
  saleMarketplace: Marketplace | null
  status: SaleStatus

  refunded: boolean
  refundAmount: number
  refundDate: string | null
  refundNote: string

  source: SaleSource
  externalReference: string | null
  tillTransactionId: string | null

  createdAt: string
  updatedAt: string
}

export type SaleRow = {
  id: string
  business_id: string
  product_id: string | null

  product_code: string | null
  sku: string | null
  product_name: string | null
  brand: string | null
  category: string | null

  quantity: number | string | null
  unit_sale_price: number | string | null
  sale_price: number | string | null
  unit_purchase_price: number | string | null
  cost_of_goods: number | string | null
  additional_costs: number | string | null

  shipping_cost: number | string | null
  platform_fees: number | string | null
  other_fees: number | string | null
  fees: number | string | null
  profit: number | string | null

  sale_date: string | null
  shipping_date: string | null
  sale_marketplace: string | null
  status: string | null

  refunded: boolean | null
  refund_amount: number | string | null
  refund_date: string | null
  refund_note: string | null

  source: string | null
  external_reference: string | null
  till_transaction_id: string | null

  created_at: string | null
  updated_at: string | null
}

export type RecordSaleInput = {
  product: Product
  quantity?: number
  salePrice: number
  saleDate: string
  shippingDate?: string | null
  saleMarketplace?: Marketplace | null
  shippingCost?: number
  platformFees?: number
  otherFees?: number
  status: 'Awaiting Shipping' | 'In Shipping' | 'Sold'
  source?: SaleSource
  externalReference?: string | null
  tillTransactionId?: string | null
}
