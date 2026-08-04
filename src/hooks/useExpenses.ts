import { createContext, useContext } from 'react'
import type { Expense, ExpenseDraft } from '../types/expense'

export type ExpenseContextType = {
  expenses: Expense[]
  loading: boolean
  addExpense: (expense: ExpenseDraft) => Promise<void>
  updateExpense: (expense: Expense) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  refreshExpenses: () => Promise<void>
}

export const ExpenseContext = createContext<ExpenseContextType | undefined>(
  undefined,
)

export function useExpenses() {
  const context = useContext(ExpenseContext)

  if (!context) {
    throw new Error('useExpenses must be used inside an ExpenseProvider')
  }

  return context
}
