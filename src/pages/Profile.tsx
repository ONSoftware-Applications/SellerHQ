import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useBusiness } from '../hooks/useBusiness'
import { useToast } from '../hooks/useToast'

function Profile() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { currentBusiness } = useBusiness()
  const { showToast } = useToast()

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

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 24px' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
              <span style={{ fontSize: '14px', color: 'var(--shq-ink-muted)' }}>Business</span>
              <span style={{ fontSize: '14px', color: 'var(--shq-ink)', fontWeight: '500' }}>
                {currentBusiness.name}
              </span>
            </div>
          )}
        </div>
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
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid var(--shq-error)',
            background: 'var(--shq-surface)',
            color: 'var(--shq-error)',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background var(--shq-transition), color var(--shq-transition)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--shq-error)'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--shq-surface)'
            e.currentTarget.style.color = 'var(--shq-error)'
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

export default Profile
