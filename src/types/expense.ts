export type ExpenseCategory =
  | 'Platform fees'
  | 'Shipping'
  | 'Packaging'
  | 'Advertising'
  | 'Subscriptions'
  | 'Transport'
  | 'Equipment'
  | 'Other'

export type Expense = {
  id: string
  businessId: string
  category: ExpenseCategory
  description: string
  amount: number
  expenseDate: string
  marketplace: string
  supplier: string
  paymentMethod: string
  notes: string
  receiptUrl: string
  createdAt: string
  updatedAt: string
}

export type ExpenseDraft = Omit<Expense, 'id' | 'businessId'>

export type ExpenseRow = {
  id: string
  business_id: string
  category: string | null
  description: string | null
  amount: number | null
  expense_date: string | null
  marketplace: string | null
  supplier: string | null
  payment_method: string | null
  notes: string | null
  receipt_url: string | null
  created_at: string | null
  updated_at: string | null
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Platform fees',
  'Shipping',
  'Packaging',
  'Advertising',
  'Subscriptions',
  'Transport',
  'Equipment',
  'Other',
]