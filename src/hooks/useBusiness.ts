import { createContext, useContext } from 'react'
import type { Business } from '../types/business'

export type BusinessContextValue = {
  businesses: Business[]
  currentBusiness: Business | null
  loading: boolean
  refreshBusinesses: () => Promise<void>
  switchBusiness: (businessId: string) => void
}

export const BusinessContext = createContext<BusinessContextValue | undefined>(
  undefined,
)

export function useBusiness() {
  const context = useContext(BusinessContext)

  if (!context) {
    throw new Error('useBusiness must be used inside a BusinessProvider')
  }

  return context
}
