import { createContext, useContext } from 'react'
import type {
  TillCheckout,
  TillHold,
  TillSession,
  TillTransaction,
} from '../types/till'

export type TillContextType = {
  session: TillSession | null
  transactions: TillTransaction[]
  holds: TillHold[]
  loading: boolean
  openSession: (startingFloat: number) => Promise<TillSession>
  closeSession: (countedCash: number) => Promise<void>
  completeTransaction: (
    checkout: TillCheckout,
  ) => Promise<TillTransaction>
  voidTransaction: (id: string, reason: string) => Promise<void>
  holdOrder: (hold: {
    items: TillCheckout['items']
    discount: number
    tax: number
    total: number
  }) => Promise<void>
  deleteHold: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

export const TillContext = createContext<TillContextType | undefined>(
  undefined,
)

export function useTill() {
  const context = useContext(TillContext)

  if (!context) {
    throw new Error('useTill must be used inside a TillProvider')
  }

  return context
}
