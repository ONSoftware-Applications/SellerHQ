import { Outlet, useNavigate } from 'react-router-dom'

import { useSubscription } from '../hooks/useSubscription'
import type { PlanFeature } from '../lib/plans'

export function PlanGuard({ feature }: { feature: PlanFeature }) {
  const navigate = useNavigate()
  const { canUse, plan } = useSubscription()

  if (canUse(feature)) {
    return <Outlet />
  }

  return (
    <div className="inventory-page">
      <div
        style={{
          textAlign: 'center',
          padding: '60px 20px',
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700 }}>
          Upgrade to unlock this
        </h1>
        <p
          style={{
            margin: '0 0 24px',
            fontSize: 14,
            color: 'var(--shq-ink-muted)',
            lineHeight: 1.6,
          }}
        >
          This feature is included in the Growing plan and above. Your current
          {plan === 'basic' ? ' free' : ''} {plan} plan doesn't include it yet.
        </p>
        <button
          type="button"
          className="primary-button"
          onClick={() => navigate('/subscriptions')}
        >
          View plans
        </button>
      </div>
    </div>
  )
}
