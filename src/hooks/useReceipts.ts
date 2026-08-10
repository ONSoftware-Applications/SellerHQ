import { createContext, useContext } from 'react'
import type { Receipt, ReceiptDraft } from '../types/receipt'

export type ReceiptContextType = {
  receipts: Receipt[]
  loading: boolean
  addReceipt: (receipt: ReceiptDraft) => Promise<void>
  deleteReceipt: (id: string, filePath: string) => Promise<void>
  refreshReceipts: () => Promise<void>
}

export const ReceiptContext = createContext<ReceiptContextType | undefined>(
  undefined,
)

export function useReceipts() {
  const context = useContext(ReceiptContext)

  if (!context) {
    throw new Error('useReceipts must be used inside a ReceiptProvider')
  }

  return context
}
