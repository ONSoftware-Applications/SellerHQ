import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import Icon from '../components/Icon'
import { useBusiness } from '../hooks/useBusiness'
import { useCurrency } from '../hooks/useCurrency'
import { useProducts } from '../hooks/useProducts'
import { useSubscription } from '../hooks/useSubscription'
import { useToast } from '../hooks/useToast'
import {
  ANNUAL_DISCOUNT,
  PLANS,
  annualPerMonth,
  annualTotal,
  getPlan,
  type BillingCycle,
  type Plan,
  type PlanId,
} from '../lib/plans'
import { supabase } from '../lib/supabase'

const PLAN_ORDER: PlanId[] = ['basic', 'growing', 'pro', 'business']

function BillingSettingsV2() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { businesses, currentBusiness } = useBusiness()
  const { products } = useProducts()
  const {
    plan,
    billing,
    status,
    isPaid,
    productLimit,
    businessLimit,
    refresh,
  } = useSubscription()
  const { money } = useCurrency()
  const { showToast } = useToast()
  const [cycle, setCycle] = useState<BillingCycle>(billing)
  const [checkingOut, setCheckingOut] = useState<PlanId | null>(null)
  const [openingPortal, setOpeningPortal] = useState(false)

  const currentPlan = getPlan(plan)
  const currentIndex = PLAN_ORDER.indexOf(plan)
  const upgradeOptions = useMemo(
    () => PLANS.filter((candidate) => PLAN_ORDER.indexOf(candidate.id) > currentIndex),
    [currentIndex],
  )

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      showToast('Payment successful — refreshing your plan.', 'success')
      setSearchParams({ view: 'billing' }, { replace: true })
      void refresh()
      const delays = [1500, 4000, 8000]
      delays.forEach((delay) => window.setTimeout(() => void refresh(), delay))
    } else if (searchParams.get('cancelled') === 'true') {
      showToast('Checkout cancelled — no billing changes were made.', 'info')
      setSearchParams({ view: 'billing' }, { replace: true })
    }
  }, [refresh, searchParams, setSearchParams, showToast])

  async function openCheckout(targetPlan: Plan) {
    const priceId = cycle === 'annual'
      ? targetPlan.stripePriceAnnualId
      : targetPlan.stripePriceMonthlyId

    if (!priceId) {
      showToast(`Checkout is not configured for ${targetPlan.name}.`, 'error')
      return
    }

    setCheckingOut(targetPlan.id)
    const { data, error } = await supabase.functions.invoke<
      { url: string } | { error: string }
    >('create-checkout', {
      body: {
        plan: targetPlan.id,
        priceId,
        billing: cycle,
        businessId: currentBusiness?.id,
      },
    })

    if (error || !data || !('url' in data) || !data.url) {
      console.error(error)
      showToast('Could not start Stripe checkout.', 'error')
      setCheckingOut(null)
      return
    }

    window.location.href = data.url
  }

  async function openBillingPortal() {
    setOpeningPortal(true)
    const { data, error } = await supabase.functions.invoke<
      { url: string } | { error: string }
    >('billing-portal', {
      body: { businessId: currentBusiness?.id },
    })

    if (error || !data || !('url' in data) || !data.url) {
      console.error(error)
      showToast('The billing portal is not available for this subscription.', 'info')
      setOpeningPortal(false)
      return
    }

    window.location.href = data.url
  }

  const productUsage = productLimit === Infinity
    ? 0
    : Math.min(100, (products.length / Math.max(productLimit, 1)) * 100)
  const businessUsage = businessLimit === Infinity
    ? 0
    : Math.min(100, (businesses.length / Math.max(businessLimit, 1)) * 100)

  return (
    <div className="billing-v2">
      <section className="panel-v2 billing-current-v2">
        <div className="billing-current-main-v2">
          <div>
            <span className="workspace-v2-eyebrow">Current plan</span>
            <h2>{currentPlan.name}</h2>
            <p>{currentPlan.tagline}</p>
          </div>
          <div className="billing-current-price-v2">
            {currentPlan.monthlyPrice === 0 ? (
              <><strong>Free</strong><span>No recurring charge</span></>
            ) : (
              <>
                <strong>{money(billing === 'annual' ? annualPerMonth(currentPlan.monthlyPrice) : currentPlan.monthlyPrice)}</strong>
                <span>/month equivalent · {billing === 'annual' ? 'annual billing' : 'monthly billing'}</span>
              </>
            )}
          </div>
        </div>

        <div className="billing-status-row-v2">
          <span className={`billing-status-v2 ${isPaid ? 'active' : ''}`}>
            <i /> {isPaid ? (status === 'active' ? 'Active subscription' : status) : 'Free plan'}
          </span>
          {isPaid && (
            <button type="button" className="secondary-button" onClick={() => void openBillingPortal()} disabled={openingPortal}>
              {openingPortal ? 'Opening…' : 'Manage billing'} <Icon name="arrow-right" size={12} />
            </button>
          )}
        </div>
      </section>

      <div className="billing-usage-grid-v2">
        <UsageCard
          label="Products"
          used={products.length}
          limit={productLimit}
          percent={productUsage}
        />
        <UsageCard
          label="Businesses"
          used={businesses.length}
          limit={businessLimit}
          percent={businessUsage}
        />
      </div>

      {upgradeOptions.length > 0 && (
        <section className="panel-v2 billing-upgrade-v2">
          <header className="panel-v2-header">
            <div>
              <h2>Upgrade your workspace</h2>
              <p>Compare only the plans above your current tier.</p>
            </div>
            <div className="billing-cycle-v2">
              <button type="button" className={cycle === 'monthly' ? 'active' : ''} onClick={() => setCycle('monthly')}>Monthly</button>
              <button type="button" className={cycle === 'annual' ? 'active' : ''} onClick={() => setCycle('annual')}>Annual · save {Math.round(ANNUAL_DISCOUNT * 100)}%</button>
            </div>
          </header>

          <div className="billing-options-v2">
            {upgradeOptions.map((candidate) => (
              <article className={`billing-option-v2 ${candidate.highlighted ? 'recommended' : ''}`} key={candidate.id}>
                <div className="billing-option-head-v2">
                  <div>
                    <h3>{candidate.name}</h3>
                    <p>{candidate.tagline}</p>
                  </div>
                  {candidate.highlighted && <span>Recommended</span>}
                </div>
                <div className="billing-option-price-v2">
                  <strong>{money(cycle === 'annual' ? annualPerMonth(candidate.monthlyPrice) : candidate.monthlyPrice)}</strong>
                  <span>/month{cycle === 'annual' ? ` · ${money(annualTotal(candidate.monthlyPrice))}/year` : ''}</span>
                </div>
                <div className="billing-option-features-v2">
                  {candidate.available
                    .filter((feature) => !feature.toLowerCase().startsWith('everything in'))
                    .slice(0, 5)
                    .map((feature) => (
                      <div key={feature}><Icon name="check" size={12} /><span>{feature}</span></div>
                    ))}
                </div>
                <button
                  type="button"
                  className={candidate.highlighted ? 'primary-button' : 'secondary-button'}
                  onClick={() => void openCheckout(candidate)}
                  disabled={checkingOut !== null}
                >
                  {checkingOut === candidate.id ? 'Opening checkout…' : `Upgrade to ${candidate.name}`}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="billing-footnote-v2">
        Payments and subscription management are handled by Stripe. Upgrades apply to the selected SellerHQ business subscription.
      </div>
    </div>
  )
}

function UsageCard({
  label,
  used,
  limit,
  percent,
}: {
  label: string
  used: number
  limit: number
  percent: number
}) {
  return (
    <section className="panel-v2 billing-usage-v2">
      <div className="billing-usage-head-v2">
        <span>{label}</span>
        <strong>{used} / {limit === Infinity ? 'Unlimited' : limit}</strong>
      </div>
      {limit !== Infinity ? (
        <div className="billing-usage-track-v2"><span style={{ width: `${percent}%` }} /></div>
      ) : (
        <div className="billing-unlimited-v2"><Icon name="check" size={13} /> Unlimited on this plan</div>
      )}
    </section>
  )
}

export default BillingSettingsV2
