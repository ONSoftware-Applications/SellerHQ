import { createContext, useContext } from 'react'
import type {
  BillingCycle,
  PlanFeature,
  PlanId,
} from '../lib/plans'

export type SubscriptionInfo = {
  plan: PlanId
  billing: BillingCycle
  status: string
  loading: boolean
  isPaid: boolean
  canUse: (feature: PlanFeature) => boolean
  productLimit: number
  businessLimit: number
  refresh: () => Promise<void>
}

export const SubscriptionContext = createContext<
  SubscriptionInfo | undefined
>(undefined)

export function useSubscription() {
  const context = useContext(SubscriptionContext)

  if (!context) {
    throw new Error(
      'useSubscription must be used inside a SubscriptionProvider',
    )
  }

  return context
}
