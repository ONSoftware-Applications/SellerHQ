import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '../lib/supabase'
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
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
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

    setExpenses((data ?? []).map(databaseToExpense))
    setLoading(false)
  }, [currentBusiness])

  const addExpense = useCallback(async (expense: ExpenseDraft) => {
    if (!currentBusiness) {
      throw new Error('No business is currently selected.')
    }

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


