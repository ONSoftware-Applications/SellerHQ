import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useBusiness } from '../hooks/useBusiness'
import { useProducts } from '../hooks/useProducts'
import { useExpenses } from '../hooks/useExpenses'
import { useSettings } from '../hooks/useSettings'
import { useSubscription } from '../hooks/useSubscription'
import { useToast } from '../hooks/useToast'
import { getPlan } from '../lib/plans'
import { downloadJson } from '../utils/format'
import { todayIsoDate } from '../lib/csv'

function Profile() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { businesses, currentBusiness } = useBusiness()
  const { products } = useProducts()
  const { expenses } = useExpenses()
  const { settings } = useSettings()
  const { plan, billing, status, canUse, productLimit } = useSubscription()
  const { showToast } = useToast()

  const planInfo = getPlan(plan)

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split('@')[0] ||
    'Account'

  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()

  async function handleSignOut() {
    const { error } = await signOut()
    if (error) {
      showToast('Failed to sign out. Please try again.', 'error')
    } else {
      navigate('/login')
    }
  }

  function handleBackup() {
    downloadJson(
      `sellerhq-backup-${todayIsoDate()}.json`,
      {
        exportedAt: new Date().toISOString(),
        user: {
          email: user?.email,
          name: displayName,
          plan,
          billing,
          status,
        },
        settings,
        businesses,
        products,
        expenses,
      },
    )
    showToast('Backup downloaded', 'success')
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '700' }}>
        Profile
      </h1>

      <div
        style={{
          background: 'var(--shq-surface)',
          border: '1px solid var(--shq-border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--shq-ink)',
              color: 'var(--shq-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: '700',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--shq-ink)' }}>
              {displayName}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--shq-ink-muted)', marginTop: '2px' }}>
              {user?.email}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--shq-border)' }}>
            <span style={{ fontSize: '14px', color: 'var(--shq-ink-muted)' }}>Email</span>
            <span style={{ fontSize: '14px', color: 'var(--shq-ink)', fontWeight: '500' }}>{user?.email}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--shq-border)' }}>
            <span style={{ fontSize: '14px', color: 'var(--shq-ink-muted)' }}>Full name</span>
            <span style={{ fontSize: '14px', color: 'var(--shq-ink)', fontWeight: '500' }}>
              {user?.user_metadata?.full_name || 'Not set'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--shq-border)' }}>
            <span style={{ fontSize: '14px', color: 'var(--shq-ink-muted)' }}>Account created</span>
            <span style={{ fontSize: '14px', color: 'var(--shq-ink)', fontWeight: '500' }}>
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
            </span>
          </div>
          {currentBusiness && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--shq-border)' }}>
              <span style={{ fontSize: '14px', color: 'var(--shq-ink-muted)' }}>Current business</span>
              <span style={{ fontSize: '14px', color: 'var(--shq-ink)', fontWeight: '500' }}>
                {currentBusiness.name} · {currentBusiness.business_type}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--shq-border)' }}>
            <span style={{ fontSize: '14px', color: 'var(--shq-ink-muted)' }}>Businesses</span>
            <span style={{ fontSize: '14px', color: 'var(--shq-ink)', fontWeight: '500' }}>
              {businesses.length}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
            <span style={{ fontSize: '14px', color: 'var(--shq-ink-muted)' }}>Products</span>
            <span style={{ fontSize: '14px', color: 'var(--shq-ink)', fontWeight: '500' }}>
              {products.length} {productLimit === Infinity ? '' : `/ ${productLimit}`}
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          background: 'var(--shq-surface)',
          border: '1px solid var(--shq-border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '600' }}>
              {planInfo.name} plan
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--shq-ink-muted)' }}>
              {billing === 'annual' ? 'Billed annually' : 'Billed monthly'}
              {status !== 'active' && status !== 'none' && ` · status: ${status}`}
            </p>
          </div>
          <button className="secondary-button" onClick={() => navigate('/subscriptions')}>
            Manage plan
          </button>
        </div>
      </div>

      <div
        style={{
          background: 'var(--shq-surface)',
          border: '1px solid var(--shq-border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600' }}>Quick links</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <LinkRow label="Settings" onClick={() => navigate('/settings')} />
          <LinkRow label="Subscriptions & billing" onClick={() => navigate('/subscriptions')} />
          {canUse('customization') && (
            <LinkRow label="Business customization & team" onClick={() => navigate('/business')} />
          )}
          <LinkRow label="Support" onClick={() => navigate('/support')} />
          <LinkRow label="Privacy policy" onClick={() => navigate('/legal/privacy')} />
          <LinkRow label="Terms & conditions" onClick={() => navigate('/legal/terms')} />
        </div>
      </div>

      <div
        style={{
          background: 'var(--shq-surface)',
          border: '1px solid var(--shq-border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '600' }}>Data</h3>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--shq-ink-muted)' }}>
          Export all of your business data as a JSON file.
        </p>
        {canUse('backupExport') ? (
          <button className="secondary-button" onClick={handleBackup}>
            Download full backup (JSON)
          </button>
        ) : (
          <button className="secondary-button" disabled title="Included in the Pro plan and above">
            Full backup — Pro plan
          </button>
        )}
      </div>

      <div
        style={{
          background: 'var(--shq-surface)',
          border: '1px solid var(--shq-border)',
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: 'var(--shq-ink)' }}>
          Actions
        </h3>
        <button
          type="button"
          onClick={handleSignOut}
          className="delete-button"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

function LinkRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        padding: '10px 4px',
        border: 'none',
        borderBottom: '1px solid var(--shq-border)',
        background: 'transparent',
        cursor: 'pointer',
        color: 'var(--shq-ink)',
        fontSize: '14px',
        textAlign: 'left',
      }}
    >
      <span>{label}</span>
      <span style={{ color: 'var(--shq-ink-faint)' }}>›</span>
    </button>
  )
}

export default Profile
