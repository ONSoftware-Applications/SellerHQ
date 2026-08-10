import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
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

    const { data: synced, error: syncError } = await supabase.functions.invoke<
      { plan?: string; billing?: string; status?: string } | { error: string }
    >('sync-subscription')

    if (!syncError && synced && 'plan' in synced && synced.plan) {
      setPlan((synced.plan as PlanId) ?? 'basic')
      setBilling((synced.billing as BillingCycle) ?? 'monthly')
      setStatus((synced.status as string) ?? 'active')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

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
  }, [user, settings.subscription.plan, settings.subscription.billing])

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
