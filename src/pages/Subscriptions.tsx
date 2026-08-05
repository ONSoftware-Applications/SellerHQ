import { useState } from 'react'

import {
  PLANS,
  ANNUAL_DISCOUNT,
  annualTotal,
  annualPerMonth,
  getPlan,
  type BillingCycle,
  type Plan,
  type PlanId,
} from '../lib/plans'
import { useSettings } from '../hooks/useSettings'
import { useToast } from '../hooks/useToast'
import { useCurrency } from '../hooks/useCurrency'

function Subscriptions() {
  const { settings, updateSettings } = useSettings()
  const { showToast } = useToast()
  const { money } = useCurrency()

  const [cycle, setCycle] = useState<BillingCycle>(
    settings.subscription.billing,
  )

  const currentPlan = settings.subscription.plan

  async function selectPlan(plan: PlanId) {
    if (plan === currentPlan) return

    await updateSettings({
      subscription: { plan, billing: cycle },
    })

    showToast(
      plan === 'basic'
        ? 'Switched to the Basic free plan'
        : `${getPlan(plan).name} plan selected`,
      'success',
    )
  }

  return (
    <div className="inventory-page">
      <div className="page-heading">
        <div>
          <h1>Subscriptions</h1>
          <p>Choose the plan that fits how you resell.</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: 4,
            background: 'var(--shq-surface-muted)',
            border: '1px solid var(--shq-border)',
            borderRadius: '10px',
          }}
        >
          <button
            type="button"
            onClick={() => setCycle('monthly')}
            style={{
              padding: '8px 18px',
              border: 'none',
              borderRadius: '8px',
              background: cycle === 'monthly' ? 'var(--shq-surface)' : 'transparent',
              color: 'var(--shq-ink)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: cycle === 'monthly' ? 'var(--shq-shadow-xs)' : 'none',
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle('annual')}
            style={{
              padding: '8px 18px',
              border: 'none',
              borderRadius: '8px',
              background: cycle === 'annual' ? 'var(--shq-surface)' : 'transparent',
              color: 'var(--shq-ink)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: cycle === 'annual' ? 'var(--shq-shadow-xs)' : 'none',
            }}
          >
            Annual{' '}
            <span
              style={{
                marginLeft: 4,
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--shq-success)',
              }}
            >
              Save {Math.round(ANNUAL_DISCOUNT * 100)}%
            </span>
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          alignItems: 'stretch',
        }}
      >
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            cycle={cycle}
            money={money}
            isCurrent={plan.id === currentPlan}
            onSelect={() => selectPlan(plan.id)}
          />
        ))}
      </div>

      <div
        style={{
          marginTop: '24px',
          padding: '16px 20px',
          background: 'var(--shq-surface-subtle)',
          border: '1px solid var(--shq-border)',
          borderRadius: '12px',
          fontSize: 13,
          color: 'var(--shq-ink-muted)',
          lineHeight: 1.6,
        }}
      >
        Plan selection is saved to your account. Payments will be processed
        securely via Stripe once billing is enabled - no charges are made today.
        You can switch between plans at any time.
      </div>
    </div>
  )
}

function PlanCard({
  plan,
  cycle,
  money,
  isCurrent,
  onSelect,
}: {
  plan: Plan
  cycle: BillingCycle
  money: (amount: number, options?: { maximumFractionDigits?: number }) => string
  isCurrent: boolean
  onSelect: () => void
}) {
  const isFree = plan.monthlyPrice === 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--shq-surface)',
        border: `1px solid ${plan.highlighted ? 'var(--shq-accent)' : 'var(--shq-border)'}`,
        borderRadius: '14px',
        padding: '24px',
        position: 'relative',
        boxShadow: plan.highlighted ? 'var(--shq-shadow-md)' : 'var(--shq-shadow-xs)',
      }}
    >
      {plan.highlighted && (
        <span
          style={{
            position: 'absolute',
            top: -12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--shq-accent)',
            color: '#1a1205',
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: 999,
          }}
        >
          MOST POPULAR
        </span>
      )}

      <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>
        {plan.name}
      </h3>
      <p
        style={{
          margin: '0 0 18px',
          fontSize: 12,
          color: 'var(--shq-ink-muted)',
          lineHeight: 1.5,
          minHeight: 36,
        }}
      >
        {plan.tagline}
      </p>

      <div style={{ marginBottom: 18, minHeight: 56 }}>
        {isFree ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 32, fontWeight: 800 }}>Free</span>
            <span style={{ fontSize: 13, color: 'var(--shq-ink-muted)' }}>
              forever
            </span>
          </div>
        ) : cycle === 'monthly' ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 32, fontWeight: 800 }}>
                {money(plan.monthlyPrice)}
              </span>
              <span style={{ fontSize: 13, color: 'var(--shq-ink-muted)' }}>
                /month
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--shq-ink-muted)', marginTop: 4 }}>
              Cancel anytime
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 32, fontWeight: 800 }}>
                {money(annualPerMonth(plan.monthlyPrice), {
                  maximumFractionDigits: 2,
                })}
              </span>
              <span style={{ fontSize: 13, color: 'var(--shq-ink-muted)' }}>
                /month
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--shq-ink-muted)', marginTop: 4 }}>
              Billed {money(annualTotal(plan.monthlyPrice))}/year · save{' '}
              {Math.round(ANNUAL_DISCOUNT * 100)}%
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {plan.available.map((feature) => (
            <div
              key={feature}
              style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5 }}
            >
              <span style={{ color: 'var(--shq-success)', flexShrink: 0, lineHeight: 1.4 }}>
                ✓
              </span>
              <span style={{ color: 'var(--shq-ink)', lineHeight: 1.4 }}>
                {feature}
              </span>
            </div>
          ))}
        </div>

        {plan.planned.length > 0 && (
          <div
            style={{
              borderTop: '1px solid var(--shq-border)',
              paddingTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--shq-ink-faint)',
              }}
            >
              Planned
            </div>
            {plan.planned.map((feature) => (
              <div
                key={feature}
                style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5 }}
              >
                <span
                  style={{
                    color: 'var(--shq-ink-faint)',
                    flexShrink: 0,
                    lineHeight: 1.4,
                    fontSize: 11,
                    paddingTop: 1,
                  }}
                >
                  ○
                </span>
                <span style={{ color: 'var(--shq-ink-muted)', lineHeight: 1.4 }}>
                  {feature}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className={
          isCurrent
            ? 'secondary-button'
            : plan.highlighted
              ? 'primary-button'
              : 'secondary-button'
        }
        onClick={onSelect}
        disabled={isCurrent}
        style={{ width: '100%', marginTop: 20 }}
      >
        {isCurrent
          ? 'Current plan'
          : isFree
            ? 'Choose Basic'
            : `Choose ${plan.name}`}
      </button>
    </div>
  )
}

export default Subscriptions
