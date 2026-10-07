import { createContext, useContext } from 'react'
import type { RecordSaleInput, Sale, SaleStatus } from '../types/sale'

export type SaleContextType = {
  sales: Sale[]
  loading: boolean
  ledgerAvailable: boolean | null
  refreshSales: () => Promise<void>
  recordSale: (input: RecordSaleInput) => Promise<string | null>
  updateSaleStatus: (
    id: string,
    status: Exclude<SaleStatus, 'Refunded' | 'Voided'>,
    shippingDate?: string | null,
  ) => Promise<void>
  updateSaleDetails: (
    id: string,
    changes: {
      salePrice: number
      saleDate: string
      shippingDate?: string | null
      saleMarketplace?: string | null
      shippingCost: number
      platformFees: number
      otherFees: number
    },
  ) => Promise<void>
  refundSale: (
    id: string,
    amount: number,
    note?: string,
  ) => Promise<void>
  voidSale: (id: string) => Promise<void>
}

export const SaleContext = createContext<SaleContextType | undefined>(
  undefined,
)

export function useSales() {
  const context = useContext(SaleContext)

  if (!context) {
    throw new Error('useSales must be used inside SaleProvider')
  }

  return context
}
