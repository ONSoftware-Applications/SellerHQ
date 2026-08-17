import type { ProductCondition } from './product'

export type TillPaymentMethod = 'cash' | 'card' | 'other'

export type TillSessionStatus = 'open' | 'closed'

export type TillTransactionStatus = 'completed' | 'voided'

export type TillTransactionDirection = 'sale' | 'purchase'

export type TillSession = {
  id: string
  businessId: string
  openedBy: string
  openedAt: string
  startingFloat: number
  expectedCash: number
  countedCash: number | null
  status: TillSessionStatus
  closedAt: string | null
}

export type TillSessionRow = {
  id: string
  business_id: string
  opened_by: string
  opened_at: string | null
  starting_float: number | string | null
  expected_cash: number | string | null
  counted_cash: number | string | null
  status: string | null
  closed_at: string | null
}

export type TillTransactionItem = {
  id: string
  productId: string | null
  name: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export type TillTransactionItemRow = {
  id: string
  product_id: string | null
  name: string
  unit_price: number | string | null
  quantity: number | null
  line_total: number | string | null
}

export type TillTransaction = {
  id: string
  businessId: string
  sessionId: string
  cashierId: string
  direction: TillTransactionDirection
  clientName: string | null
  subtotal: number
  discount: number
  tax: number
  total: number
  paymentMethod: TillPaymentMethod
  amountTendered: number
  changeDue: number
  status: TillTransactionStatus
  voidReason: string | null
  createdAt: string
  items: TillTransactionItem[]
}

export type TillTransactionRow = {
  id: string
  business_id: string
  session_id: string
  cashier_id: string
  direction: string | null
  client_name: string | null
  subtotal: number | string | null
  discount: number | string | null
  tax: number | string | null
  total: number | string | null
  payment_method: string | null
  amount_tendered: number | string | null
  change_due: number | string | null
  status: string | null
  void_reason: string | null
  created_at: string | null
}

export type TillBasketItem = {
  productId: string | null
  name: string
  unitPrice: number
  quantity: number
  stockLimit: number
}

export type TillHoldItem = {
  productId: string | null
  name: string
  unitPrice: number
  quantity: number
}

export type TillHold = {
  id: string
  businessId: string
  sessionId: string
  items: TillHoldItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  createdAt: string
}

export type TillCheckout = {
  items: TillBasketItem[]
  discount: number
  tax: number
  paymentMethod: TillPaymentMethod
  amountTendered: number
}

export type TillPurchaseItem = {
  name: string
  brand: string
  category: string
  size: string
  colour: string
  condition: ProductCondition
  purchasePrice: number
  quantity: number
}

export type TillPurchaseCheckout = {
  items: TillPurchaseItem[]
  paymentMethod: TillPaymentMethod
  clientName: string
}
