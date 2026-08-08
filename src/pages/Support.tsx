import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings'
import { useSubscription } from '../hooks/useSubscription'

function Support() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { settings } = useSettings()
  const { plan } = useSubscription()

  const subject = encodeURIComponent('SellerHQ support request')
  const body = encodeURIComponent(
    `Plan: ${plan}\nBusiness: ${settings.business.businessName || '—'}\n\n`,
  )
  const mailto = `mailto:support@sellerhq.onsoftware.uk?subject=${subject}&body=${body}`

  return (
    <div className="inventory-page" style={{ maxWidth: 680 }}>
      <button
        type="button"
        className="text-button"
        style={{ marginBottom: 16 }}
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 700 }}>
        Support
      </h1>
      <p
        style={{
          margin: '0 0 32px',
          fontSize: 14,
          color: 'var(--shq-ink-muted)',
        }}
      >
        We're here to help. Choose how you'd like to get in touch.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: 28,
        }}
      >
        <a
          href={mailto}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div
            className="card"
            style={{
              padding: 24,
              border: '1px solid var(--shq-border)',
              borderRadius: 12,
              background: 'var(--shq-surface)',
            }}
          >
            <div style={{ fontSize: 26, marginBottom: 10 }}>✉️</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              Email support
            </div>
            <div style={{ fontSize: 13, color: 'var(--shq-ink-muted)', lineHeight: 1.5 }}>
             adminonsoftware@gmail.com
              <br />
              Pre-filled with your account details
            </div>
          </div>
        </a>

        <a
          href="https://github.com/ONSoftware-Applications/SellerHQ/issues"
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div
            className="card"
            style={{
              padding: 24,
              border: '1px solid var(--shq-border)',
              borderRadius: 12,
              background: 'var(--shq-surface)',
            }}
          >
            <div style={{ fontSize: 26, marginBottom: 10 }}>🐛</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              Report a bug
            </div>
            <div style={{ fontSize: 13, color: 'var(--shq-ink-muted)', lineHeight: 1.5 }}>
              Open an issue on GitHub with details of the problem.
            </div>
          </div>
        </a>

        <a
          href="mailto:adminonsoftware@gmail.com?subject=Feature%20request"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div
            className="card"
            style={{
              padding: 24,
              border: '1px solid var(--shq-border)',
              borderRadius: 12,
              background: 'var(--shq-surface)',
            }}
          >
            <div style={{ fontSize: 26, marginBottom: 10 }}>💡</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              Request a feature
            </div>
            <div style={{ fontSize: 13, color: 'var(--shq-ink-muted)', lineHeight: 1.5 }}>
              Tell us what would make SellerHQ better for you.
            </div>
          </div>
        </a>
      </div>

      <div
        style={{
          padding: 20,
          background: 'var(--shq-surface-subtle)',
          border: '1px solid var(--shq-border)',
          borderRadius: 12,
          fontSize: 13,
          color: 'var(--shq-ink-muted)',
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: 'var(--shq-ink)' }}>Priority support</strong>{' '}
        — Pro and Business plans receive priority responses. Your current plan
        is {plan}.
        {user?.email && (
          <span>
            {' '}
            We'll use {user.email} to get back to you.
          </span>
        )}
      </div>
    </div>
  )
}

export default Support
