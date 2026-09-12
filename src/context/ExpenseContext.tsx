import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '../lib/supabase'
import { RECEIPTS_BUCKET } from '../lib/storage'
import { useBusiness } from '../hooks/useBusiness'
import { ExpenseContext } from '../hooks/useExpenses'
import type { Expense, ExpenseDraft, ExpenseRow } from '../types/expense'

function databaseToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    businessId: row.business_id,
    category: (row.category as Expense['category']) ?? 'Other',
    description: row.description ?? '',
    amount: Number(row.amount ?? 0),
    expenseDate: row.expense_date ?? '',
    marketplace: row.marketplace ?? '',
    supplier: row.supplier ?? '',
    paymentMethod: row.payment_method ?? '',
    notes: row.notes ?? '',
    receiptUrl: row.receipt_url ?? '',
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  }
}

function receiptExtension(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/gif') return 'gif'
  if (mimeType === 'application/pdf') return 'pdf'

  const candidate = mimeType.split('/').pop()?.replace(/[^a-zA-Z0-9]+/g, '')
  return candidate || 'bin'
}

async function persistExpenseReceipt(receiptUrl: string): Promise<string> {
  if (!receiptUrl || !receiptUrl.startsWith('data:')) {
    return receiptUrl
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return receiptUrl
    }

    const response = await fetch(receiptUrl)
    const blob = await response.blob()
    const extension = receiptExtension(blob.type)
    const nonce = Math.random().toString(36).slice(2, 10)
    const path = `${user.id}/expense-${Date.now()}-${nonce}.${extension}`

    const { error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .upload(path, blob, { upsert: false })

    if (error) {
      console.error('Failed to persist expense receipt:', error)
      return receiptUrl
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(path)

    return publicUrl
  } catch (error) {
    console.error('Failed to convert expense receipt to storage:', error)
    return receiptUrl
  }
}

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const { currentBusiness } = useBusiness()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const refreshExpenses = useCallback(async () => {
    if (!currentBusiness) {
      setExpenses([])
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('business_id', currentBusiness.id)
      .order('expense_date', { ascending: false })

    if (error) {
      console.error('Failed to load expenses:', error)
      setExpenses([])
      setLoading(false)
      return
    }

    const loadedExpenses = (data ?? []).map(databaseToExpense)

    const normalisedExpenses = await Promise.all(
      loadedExpenses.map(async (expense) => {
        const receiptUrl = await persistExpenseReceipt(expense.receiptUrl)

        if (receiptUrl === expense.receiptUrl) {
          return expense
        }

        const { error: updateError } = await supabase
          .from('expenses')
          .update({ receipt_url: receiptUrl })
          .eq('id', expense.id)

        if (updateError) {
          console.error('Failed to migrate legacy expense receipt:', updateError)
        }

        return { ...expense, receiptUrl }
      }),
    )

    setExpenses(normalisedExpenses)
    setLoading(false)
  }, [currentBusiness])

  const addExpense = useCallback(async (expense: ExpenseDraft) => {
    if (!currentBusiness) {
      throw new Error('No business is currently selected.')
    }

    const receiptUrl = await persistExpenseReceipt(expense.receiptUrl)

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        business_id: currentBusiness.id,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        expense_date: expense.expenseDate,
        marketplace: expense.marketplace || null,
        supplier: expense.supplier || null,
        payment_method: expense.paymentMethod || null,
        notes: expense.notes || null,
        receipt_url: receiptUrl || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to add expense:', error)
      throw error
    }

    setExpenses((current) => [databaseToExpense(data), ...current])
  }, [currentBusiness])

  const updateExpense = useCallback(async (expense: Expense) => {
    const receiptUrl = await persistExpenseReceipt(expense.receiptUrl)

    const { data, error } = await supabase
      .from('expenses')
      .update({
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        expense_date: expense.expenseDate,
        marketplace: expense.marketplace || null,
        supplier: expense.supplier || null,
        payment_method: expense.paymentMethod || null,
        notes: expense.notes || null,
        receipt_url: receiptUrl || null,
      })
      .eq('id', expense.id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update expense:', error)
      throw error
    }

    setExpenses((current) =>
      current.map((existing) =>
        existing.id === expense.id ? databaseToExpense(data) : existing,
      ),
    )
  }, [])

  const deleteExpense = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete expense:', error)
      throw error
    }

    setExpenses((current) => current.filter((expense) => expense.id !== id))
  }, [])

  useEffect(() => {
    refreshExpenses()
  }, [refreshExpenses])

  const value = useMemo(
    () => ({
      expenses,
      loading,
      addExpense,
      updateExpense,
      deleteExpense,
      refreshExpenses,
    }),
    [expenses, loading, addExpense, updateExpense, deleteExpense, refreshExpenses],
  )

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>
}

