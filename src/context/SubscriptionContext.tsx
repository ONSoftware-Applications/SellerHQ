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

    const businessId = currentBusiness?.id ?? null

    // The webhook is the source of truth for the persisted row. Prefer a
    // business-scoped row (the entitlement a team sees), then fall back to
    // the user's own row so legacy subscriptions with a null business_id
    // still resolve.
    let row: {
      plan?: string
      billing?: string
      status?: string
    } | null = null

    if (businessId) {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle()
      if (!error && data) row = data
    }

    if (!row) {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!error && data) row = data
    }

    if (row) {
      setPlan((row.plan as PlanId) ?? 'basic')
      setBilling((row.billing as BillingCycle) ?? 'monthly')
      setStatus((row.status as string) ?? 'active')
      setLoading(false)
      return
    }

    // No persisted row yet (webhook not delivered, or legacy account). Ask
    // Stripe directly so the user's real plan is shown instead of a free
    // fallback. Errors here fall through to settings rather than downgrading.
    const { data: synced, error: syncError } = await supabase.functions.invoke<
      { plan?: string; billing?: string; status?: string } | { error: string }
    >('sync-subscription', {
      body: { businessId },
    })

    if (!syncError && synced && 'plan' in synced && synced.plan) {
      setPlan((synced.plan as PlanId) ?? 'basic')
      setBilling((synced.billing as BillingCycle) ?? 'monthly')
      setStatus((synced.status as string) ?? 'active')
      setLoading(false)
      return
    }

    setPlan(settings.subscription.plan)
    setBilling(settings.subscription.billing)
    setStatus('active')

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
