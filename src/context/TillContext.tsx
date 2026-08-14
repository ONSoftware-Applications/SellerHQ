import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useBusiness } from '../hooks/useBusiness'
import { useProducts } from '../hooks/useProducts'
import { useSettings } from '../hooks/useSettings'
import { logAudit } from '../lib/audit'
import { TillContext } from '../hooks/useTill'
import type { Product } from '../types/product'
import type {
  TillCheckout,
  TillHold,
  TillHoldItem,
  TillPaymentMethod,
  TillSession,
  TillSessionRow,
  TillTransaction,
  TillTransactionItem,
  TillTransactionItemRow,
  TillTransactionRow,
} from '../types/till'

function num(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapSession(row: TillSessionRow): TillSession {
  return {
    id: row.id,
    businessId: row.business_id,
    openedBy: row.opened_by,
    openedAt: row.opened_at ?? '',
    startingFloat: num(row.starting_float),
    expectedCash: num(row.expected_cash),
    countedCash: row.counted_cash === null ? null : num(row.counted_cash),
    status: row.status === 'closed' ? 'closed' : 'open',
    closedAt: row.closed_at,
  }
}

function mapTransactionItem(row: TillTransactionItemRow): TillTransactionItem {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    unitPrice: num(row.unit_price),
    quantity: Number(row.quantity ?? 1),
    lineTotal: num(row.line_total),
  }
}

function mapTransaction(
  row: TillTransactionRow & {
    till_transaction_items?: TillTransactionItemRow[]
  },
): TillTransaction {
  return {
    id: row.id,
    businessId: row.business_id,
    sessionId: row.session_id,
    cashierId: row.cashier_id,
    subtotal: num(row.subtotal),
    discount: num(row.discount),
    tax: num(row.tax),
    total: num(row.total),
    paymentMethod: (row.payment_method ?? 'cash') as TillPaymentMethod,
    amountTendered: num(row.amount_tendered),
    changeDue: num(row.change_due),
    status: row.status === 'voided' ? 'voided' : 'completed',
    voidReason: row.void_reason,
    createdAt: row.created_at ?? '',
    items: (row.till_transaction_items ?? []).map(mapTransactionItem),
  }
}

function mapHold(row: {
  id: string
  business_id: string
  session_id: string
  items: TillHoldItem[] | string | null
  subtotal: number | string | null
  discount: number | string | null
  tax: number | string | null
  total: number | string | null
  created_at: string | null
}): TillHold {
  let items: TillHoldItem[] = []
  if (typeof row.items === 'string') {
    try {
      items = JSON.parse(row.items) as TillHoldItem[]
    } catch {
      items = []
    }
  } else if (Array.isArray(row.items)) {
    items = row.items
  }
  return {
    id: row.id,
    businessId: row.business_id,
    sessionId: row.session_id,
    items,
    subtotal: num(row.subtotal),
    discount: num(row.discount),
    tax: num(row.tax),
    total: num(row.total),
    createdAt: row.created_at ?? '',
  }
}

export function TillProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { currentBusiness } = useBusiness()
  const { products, updateProduct, logEvent } = useProducts()
  const { settings } = useSettings()

  const [session, setSession] = useState<TillSession | null>(null)
  const [transactions, setTransactions] = useState<TillTransaction[]>([])
  const [holds, setHolds] = useState<TillHold[]>([])
  const [loading, setLoading] = useState(true)

  const businessId = currentBusiness?.id

  const refresh = useCallback(async () => {
    if (!businessId) {
      setSession(null)
      setTransactions([])
      setHolds([])
      setLoading(false)
      return
    }

    setLoading(true)

    const { data: sessionRows, error: sessionError } = await supabase
      .from('till_sessions')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)

    if (sessionError) {
      console.error('Failed to load till session:', sessionError)
      setSession(null)
      setTransactions([])
      setHolds([])
      setLoading(false)
      return
    }

    const openSession =
      sessionRows && sessionRows.length > 0
        ? mapSession(sessionRows[0] as TillSessionRow)
        : null
    setSession(openSession)

    if (!openSession) {
      setTransactions([])
      setHolds([])
      setLoading(false)
      return
    }

    const [transactionsResult, holdsResult] = await Promise.all([
      supabase
        .from('till_transactions')
        .select('*, till_transaction_items(*)')
        .eq('session_id', openSession.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('till_holds')
        .select('*')
        .eq('session_id', openSession.id)
        .order('created_at', { ascending: false }),
    ])

    if (transactionsResult.error) {
      console.error('Failed to load till transactions:', transactionsResult.error)
    } else {
      setTransactions(
        (transactionsResult.data ?? []).map((row) =>
          mapTransaction(
            row as TillTransactionRow & {
              till_transaction_items?: TillTransactionItemRow[]
            },
          ),
        ),
      )
    }

    if (holdsResult.error) {
      console.error('Failed to load till holds:', holdsResult.error)
    } else {
      setHolds((holdsResult.data ?? []).map((row) => mapHold(row as never)))
    }

    setLoading(false)
  }, [businessId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const openSession = useCallback(
    async (startingFloat: number): Promise<TillSession> => {
      if (!businessId || !user) {
        throw new Error('No business selected')
      }

      if (session) return session

      const { data, error } = await supabase
        .from('till_sessions')
        .insert({
          business_id: businessId,
          opened_by: user.id,
          starting_float: startingFloat,
          expected_cash: startingFloat,
          status: 'open',
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to open till session:', error)
        throw error
      }

      const created = mapSession(data as TillSessionRow)
      setSession(created)
      void logAudit('till.session.opened', { float: startingFloat }, businessId)
      return created
    },
    [businessId, user, session],
  )

  const closeSession = useCallback(
    async (countedCash: number) => {
      if (!businessId || !session) return

      const expected =
        session.startingFloat +
        transactions
          .filter(
            (t) => t.status === 'completed' && t.paymentMethod === 'cash',
          )
          .reduce((sum, t) => sum + t.total, 0)

      const { error } = await supabase
        .from('till_sessions')
        .update({
          status: 'closed',
          counted_cash: countedCash,
          expected_cash: expected,
          closed_at: new Date().toISOString(),
        })
        .eq('id', session.id)

      if (error) {
        console.error('Failed to close till session:', error)
        throw error
      }

      void logAudit(
        'till.session.closed',
        { expected, counted: countedCash, variance: countedCash - expected },
        businessId,
      )

      setSession(null)
      setTransactions([])
      setHolds([])
    },
    [businessId, session, transactions],
  )

  const completeTransaction = useCallback(
    async (checkout: TillCheckout): Promise<TillTransaction> => {
      if (!businessId || !user || !session) {
        throw new Error('No open till session')
      }

      const subtotal = checkout.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      )
      const total = Math.max(
        0,
        Math.round((subtotal - checkout.discount + checkout.tax) * 100) / 100,
      )
      const amountTendered =
        checkout.paymentMethod === 'cash'
          ? Math.max(checkout.amountTendered, total)
          : total
      const changeDue =
        checkout.paymentMethod === 'cash'
          ? Math.round((amountTendered - total) * 100) / 100
          : 0

      const { data: transactionRow, error: transactionError } = await supabase
        .from('till_transactions')
        .insert({
          business_id: businessId,
          session_id: session.id,
          cashier_id: user.id,
          subtotal,
          discount: checkout.discount,
          tax: checkout.tax,
          total,
          payment_method: checkout.paymentMethod,
          amount_tendered: amountTendered,
          change_due: changeDue,
          status: 'completed',
        })
        .select()
        .single()

      if (transactionError || !transactionRow) {
        console.error('Failed to record till transaction:', transactionError)
        throw transactionError ?? new Error('Failed to record transaction')
      }

      const transactionId = transactionRow.id as string

      const { data: itemRows, error: itemsError } = await supabase
        .from('till_transaction_items')
        .insert(
          checkout.items.map((item) => ({
            transaction_id: transactionId,
            product_id: item.productId,
            name: item.name,
            unit_price: item.unitPrice,
            quantity: item.quantity,
            line_total: Math.round(item.unitPrice * item.quantity * 100) / 100,
          })),
        )
        .select()

      if (itemsError) {
        console.error('Failed to record till items:', itemsError)
      }

      const saleStatus: Product['status'] = settings.features.shippingFlowEnabled
        ? 'Awaiting Shipping'
        : 'Sold'

      for (const item of checkout.items) {
        if (!item.productId) continue
        const product = products.find((p) => p.id === item.productId)
        if (!product) continue

        const remainingQuantity = Math.max(0, product.quantity - item.quantity)
        const profit =
          (item.unitPrice - product.purchasePrice) * item.quantity -
          product.additionalCosts

        await updateProduct({
          ...product,
          quantity: remainingQuantity,
          status: remainingQuantity > 0 ? product.status : saleStatus,
          salePrice: item.unitPrice * item.quantity,
          saleDate: new Date().toISOString().split('T')[0],
          saleMarketplace: 'In Store',
          shippingCost: 0,
          platformFees: 0,
          otherFees: 0,
          fees: 0,
          profit,
          updatedAt: new Date().toISOString(),
        })

        void logEvent(
          product.id,
          'till_sale',
          `Sold ${item.quantity} in till`,
          {
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            transactionId,
          },
        )
      }

      void logAudit(
        'till.sale',
        { transactionId, total, payment: checkout.paymentMethod, items: checkout.items.length },
        businessId,
      )

      const transaction: TillTransaction = {
        id: transactionId,
        businessId,
        sessionId: session.id,
        cashierId: user.id,
        subtotal,
        discount: checkout.discount,
        tax: checkout.tax,
        total,
        paymentMethod: checkout.paymentMethod,
        amountTendered,
        changeDue,
        status: 'completed',
        voidReason: null,
        createdAt: transactionRow.created_at as string,
        items: (itemRows ?? []).map(mapTransactionItem),
      }

      setTransactions((prev) => [transaction, ...prev])
      return transaction
    },
    [businessId, user, session, products, updateProduct, logEvent, settings],
  )

  const voidTransaction = useCallback(
    async (id: string, reason: string) => {
      if (!businessId) return

      const transaction = transactions.find((t) => t.id === id)
      if (!transaction) return

      const { error } = await supabase
        .from('till_transactions')
        .update({ status: 'voided', void_reason: reason })
        .eq('id', id)

      if (error) {
        console.error('Failed to void transaction:', error)
        throw error
      }

      for (const item of transaction.items) {
        if (!item.productId) continue
        const product = products.find((p) => p.id === item.productId)
        if (!product) continue

        const newQuantity = product.quantity + item.quantity
        const wasSold = ['Sold', 'Awaiting Shipping', 'In Shipping'].includes(
          product.status,
        ) && product.quantity === 0

        await updateProduct({
          ...product,
          quantity: newQuantity,
          ...(wasSold
            ? {
                status: 'Unlisted' as Product['status'],
                salePrice: null,
                saleDate: null,
                saleMarketplace: null,
                profit: 0,
                fees: 0,
                shippingCost: 0,
                platformFees: 0,
                otherFees: 0,
              }
            : {}),
          updatedAt: new Date().toISOString(),
        })
      }

      void logAudit(
        'till.sale.voided',
        { transactionId: id, reason },
        businessId,
      )

      setTransactions((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, status: 'voided' as const, voidReason: reason }
            : t,
        ),
      )
    },
    [businessId, transactions, products, updateProduct],
  )

  const holdOrder = useCallback(
    async (hold: {
      items: TillCheckout['items']
      discount: number
      tax: number
      total: number
    }) => {
      if (!businessId || !session) return

      const subtotal = hold.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      )

      const { error } = await supabase.from('till_holds').insert({
        business_id: businessId,
        session_id: session.id,
        items: hold.items.map(
          (item) =>
            ({
              productId: item.productId,
              name: item.name,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
            }) satisfies TillHoldItem,
        ),
        subtotal,
        discount: hold.discount,
        tax: hold.tax,
        total: hold.total,
      })

      if (error) {
        console.error('Failed to hold order:', error)
        throw error
      }

      await refresh()
    },
    [businessId, session, refresh],
  )

  const deleteHold = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('till_holds')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Failed to delete hold:', error)
        throw error
      }

      setHolds((prev) => prev.filter((h) => h.id !== id))
    },
    [],
  )

  const value = useMemo(
    () => ({
      session,
      transactions,
      holds,
      loading,
      openSession,
      closeSession,
      completeTransaction,
      voidTransaction,
      holdOrder,
      deleteHold,
      refresh,
    }),
    [
      session,
      transactions,
      holds,
      loading,
      openSession,
      closeSession,
      completeTransaction,
      voidTransaction,
      holdOrder,
      deleteHold,
      refresh,
    ],
  )

  return <TillContext.Provider value={value}>{children}</TillContext.Provider>
}
