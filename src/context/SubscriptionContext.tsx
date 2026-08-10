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
import { useSettings } from '../hooks/useSettings'
import {
  SubscriptionContext,
  type SubscriptionInfo,
} from '../hooks/useSubscription'
import {
  planBusinessLimit,
  planCanUse,
  planProductLimit,
  type BillingCycle,
  type PlanFeature,
  type PlanId,
} from '../lib/plans'

export function SubscriptionProvider({
  children,
}: {
  children: ReactNode
}) {
  const { user } = useAuth()
  const { currentBusiness } = useBusiness()
  const { settings } = useSettings()

  const [plan, setPlan] = useState<PlanId>(
    settings.subscription.plan,
  )
  const [billing, setBilling] = useState<BillingCycle>(
    settings.subscription.billing,
  )
  const [status, setStatus] = useState('active')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setPlan(settings.subscription.plan)
      setBilling(settings.subscription.billing)
      setStatus('active')
      setLoading(false)
      return
    }

    setLoading(true)

    // Background sync: asks Stripe to refresh the stored subscription. The
    // webhook is the source of truth; the return value is not used to set the
    // plan because a non-subscriber would be incorrectly downgraded.
    void supabase.functions.invoke('sync-subscription', {
      body: { businessId: currentBusiness?.id ?? null },
    })

    // Entitlement is business-scoped: resolve the current business's
    // subscription first, falling back to the user's own row.
    let query = supabase.from('subscriptions').select('*')
    if (currentBusiness) {
      query = query.eq('business_id', currentBusiness.id)
    } else {
      query = query.eq('user_id', user.id)
    }

    const { data, error } = await query.maybeSingle()

    if (!error && data) {
      setPlan((data.plan as PlanId) ?? 'basic')
      setBilling((data.billing as BillingCycle) ?? 'monthly')
      setStatus((data.status as string) ?? 'active')
    } else {
      setPlan(settings.subscription.plan)
      setBilling(settings.subscription.billing)
      setStatus('active')
    }

    setLoading(false)
  }, [user, currentBusiness, settings.subscription.plan, settings.subscription.billing])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const canUse = useCallback(
    (feature: PlanFeature) => planCanUse(plan, feature),
    [plan],
  )

  const value = useMemo<SubscriptionInfo>(
    () => ({
      plan,
      billing,
      status,
      loading,
      isPaid: plan !== 'basic',
      canUse,
      productLimit: planProductLimit(plan),
      businessLimit: planBusinessLimit(plan),
      refresh,
    }),
    [plan, billing, status, loading, canUse, refresh],
  )

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}
