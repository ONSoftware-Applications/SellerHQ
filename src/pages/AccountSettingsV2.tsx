import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ConfirmDialog from '../components/ConfirmDialog'
import Icon from '../components/Icon'
import { useAuth } from '../hooks/useAuth'
import { useBusiness } from '../hooks/useBusiness'
import { useExpenses } from '../hooks/useExpenses'
import { useProducts } from '../hooks/useProducts'
import { useSettings } from '../hooks/useSettings'
import { useSubscription } from '../hooks/useSubscription'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'
import { todayIsoDate } from '../lib/csv'
import { downloadJson } from '../utils/format'

function AccountSettingsV2() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { businesses } = useBusiness()
  const { products } = useProducts()
  const { expenses } = useExpenses()
  const { settings } = useSettings()
  const { plan, billing, status, canUse } = useSubscription()
  const { showToast } = useToast()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
      showToast('Could not sign out. Please try again.', 'error')
      return
    }
    navigate('/login')
  }

  function handleBackup() {
    downloadJson(`sellerhq-backup-${todayIsoDate()}.json`, {
      exportedAt: new Date().toISOString(),
      account: {
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
    })
    showToast('SellerHQ backup downloaded', 'success')
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    const { data, error } = await supabase.functions.invoke<
      { deleted?: boolean } | { error: string }
    >('delete-account')

    if (error || !data || !('deleted' in data) || !data.deleted) {
      console.error(error)
      setDeleting(false)
      setConfirmDelete(false)
      showToast('Your account could not be deleted. Please try again.', 'error')
      return
    }

    setDeleting(false)
    setConfirmDelete(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="account-settings-v2">
      <div className="account-settings-grid-v2">
        <section className="panel-v2 account-identity-v2">
          <div className="account-avatar-v2">{initials}</div>
          <div className="account-identity-copy-v2">
            <h2>{displayName}</h2>
            <p>{user?.email}</p>
            <span>SellerHQ account</span>
          </div>
          <button type="button" className="secondary-button" onClick={() => void handleSignOut()}>
            <Icon name="logout" size={14} /> Sign out
          </button>
        </section>

        <section className="panel-v2">
          <header className="panel-v2-header"><div><h2>Account information</h2><p>Identity associated with this SellerHQ login.</p></div></header>
          <div className="account-details-v2">
            <AccountRow label="Email" value={user?.email || '—'} />
            <AccountRow label="Full name" value={(user?.user_metadata?.full_name as string | undefined) || 'Not set'} />
            <AccountRow
              label="Account created"
              value={user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : '—'}
            />
            <AccountRow label="Businesses" value={String(businesses.length)} />
          </div>
        </section>

        <section className="panel-v2">
          <header className="panel-v2-header"><div><h2>Your data</h2><p>Portable copies of information stored in your SellerHQ account.</p></div></header>
          <div className="account-data-summary-v2">
            <div><span>Products</span><strong>{products.length}</strong></div>
            <div><span>Expenses</span><strong>{expenses.length}</strong></div>
            <div><span>Businesses</span><strong>{businesses.length}</strong></div>
          </div>
          {canUse('backupExport') ? (
            <button type="button" className="secondary-button" onClick={handleBackup}>
              <Icon name="download" size={14} /> Download full JSON backup
            </button>
          ) : (
            <div className="settings-locked-v2">
              <strong>Full backup export</strong>
              <span>Available on Pro and Business plans.</span>
            </div>
          )}
        </section>

        <section className="panel-v2 account-danger-v2">
          <header className="panel-v2-header"><div><h2>Delete account</h2><p>Permanently remove this account and its SellerHQ data.</p></div></header>
          <div className="account-danger-copy-v2">
            Deleting the account removes businesses, products, expenses and stored product data. This cannot be undone.
          </div>
          <button type="button" className="account-danger-button-v2" onClick={() => setConfirmDelete(true)} disabled={deleting}>
            {deleting ? 'Deleting account…' : 'Delete SellerHQ account'}
          </button>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete account?"
        variant="danger"
        confirmLabel="Delete account"
        message="This permanently deletes your SellerHQ account, businesses, products, expenses and stored data. This action cannot be undone."
        onConfirm={handleDeleteAccount}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function AccountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="account-row-v2">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default AccountSettingsV2
