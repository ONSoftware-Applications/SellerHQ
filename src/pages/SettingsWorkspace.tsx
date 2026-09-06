import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import Icon from '../components/Icon'
import WorkspaceShell, { type WorkspaceTab } from '../components/WorkspaceShell'
import { useBusiness } from '../hooks/useBusiness'
import { useSettings } from '../hooks/useSettings'
import { useSubscription } from '../hooks/useSubscription'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'
import AuditLog from './AuditLog'
import BusinessCustomization from './BusinessCustomization'
import Profile from './Profile'
import SettingsPreferencesV2 from './SettingsPreferencesV2'
import Subscriptions from './Subscriptions'
import TeamHub from './TeamHub'

type SettingsView = 'preferences' | 'business' | 'branding' | 'team' | 'billing' | 'account' | 'activity'

function SettingsWorkspace() {
  const [params, setParams] = useSearchParams()
  const { canUse } = useSubscription()

  const requested = params.get('view') as SettingsView | null
  const allowed: SettingsView[] = ['preferences', 'business', 'branding', 'team', 'billing', 'account', 'activity']
  const view: SettingsView = requested && allowed.includes(requested) ? requested : 'preferences'

  const tabs: WorkspaceTab[] = [
    { id: 'preferences', label: 'Preferences', icon: 'settings' },
    { id: 'business', label: 'Business', icon: 'building' },
    { id: 'branding', label: 'Branding', icon: 'sparkles' },
    { id: 'team', label: 'Team & permissions', icon: 'team' },
    { id: 'billing', label: 'Billing', icon: 'wallet' },
    { id: 'account', label: 'Account & data', icon: 'profile' },
    ...(canUse('auditLog') ? [{ id: 'activity', label: 'Security & activity', icon: 'reports' as const }] : []),
  ]

  return (
    <WorkspaceShell
      title="Settings"
      description="Manage your account, business, workspace behaviour, team and billing."
      eyebrow="Workspace"
      tabs={tabs}
      activeTab={view}
      onTabChange={(next) => setParams(next === 'preferences' ? {} : { view: next })}
    >
      {view === 'business' ? (
        <BusinessSettingsView onOpen={(next) => setParams({ view: next })} />
      ) : (
        <div className="workspace-v2-embedded workspace-v2-embedded-settings">
          {view === 'preferences' && <SettingsPreferencesV2 />}
          {view === 'branding' && <BusinessCustomization />}
          {view === 'team' && <TeamHub />}
          {view === 'billing' && <Subscriptions />}
          {view === 'account' && <Profile />}
          {view === 'activity' && canUse('auditLog') && <AuditLog />}
        </div>
      )}
    </WorkspaceShell>
  )
}

function BusinessSettingsView({ onOpen }: { onOpen: (view: SettingsView) => void }) {
  const { currentBusiness, refreshBusinesses } = useBusiness()
  const { settings, updateSettings } = useSettings()
  const { showToast } = useToast()
  const { canUse } = useSubscription()
  const [name, setName] = useState(currentBusiness?.name ?? '')
  const [type, setType] = useState(currentBusiness?.business_type ?? 'Sole Trader')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(currentBusiness?.name ?? '')
    setType(currentBusiness?.business_type ?? 'Sole Trader')
  }, [currentBusiness])

  if (!currentBusiness) {
    return <div className="action-empty-v2"><strong>No business selected</strong><span>Select a business to manage its workspace settings.</span></div>
  }

  async function saveIdentity() {
    const trimmed = name.trim()
    if (!trimmed) {
      showToast('Business name cannot be empty.', 'error')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('businesses')
      .update({ name: trimmed, business_type: type })
      .eq('id', currentBusiness!.id)
    setSaving(false)
    if (error) {
      console.error(error)
      showToast('Business details could not be updated.', 'error')
      return
    }
    await refreshBusinesses()
    showToast('Business details updated', 'success')
  }

  return (
    <div className="settings-business-v2">
      <div className="settings-business-grid-v2">
        <section className="panel-v2 settings-section-v2">
          <header className="panel-v2-header"><div><h2>Business identity</h2><p>Used throughout SellerHQ and on business-facing tools.</p></div></header>
          <div className="settings-form-grid-v2">
            <label>
              <span>Business name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              <span>Business type</span>
              <select value={type} onChange={(event) => setType(event.target.value)}>
                <option value="Sole Trader">Sole Trader</option>
                <option value="Limited Company">Limited Company</option>
                <option value="Partnership">Partnership</option>
              </select>
            </label>
          </div>
          <button type="button" className="primary-button" onClick={() => void saveIdentity()} disabled={saving}>
            {saving ? 'Saving…' : 'Save business details'}
          </button>
        </section>

        <section className="panel-v2 settings-section-v2">
          <header className="panel-v2-header"><div><h2>Currency</h2><p>Default monetary format for this SellerHQ workspace.</p></div></header>
          {canUse('multiCurrency') ? (
            <label className="settings-field-v2">
              <span>Default currency</span>
              <select
                value={settings.business.defaultCurrency}
                onChange={async (event) => {
                  await updateSettings({ business: { ...settings.business, defaultCurrency: event.target.value } })
                  showToast('Default currency updated', 'success')
                }}
              >
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </label>
          ) : (
            <div className="settings-locked-v2"><strong>GBP (£)</strong><span>Multi-currency is available on eligible plans.</span></div>
          )}
        </section>

        <section className="panel-v2 settings-section-v2">
          <header className="panel-v2-header"><div><h2>Branding</h2><p>Logo, accent colour, white-labelling and printed label branding.</p></div><Icon name="sparkles" size={17} /></header>
          <button type="button" className="secondary-button" onClick={() => onOpen('branding')}>Open branding settings</button>
        </section>

        <section className="panel-v2 settings-section-v2">
          <header className="panel-v2-header"><div><h2>Team & access</h2><p>Invite users, manage roles and control page permissions.</p></div><Icon name="team" size={17} /></header>
          <button type="button" className="secondary-button" onClick={() => onOpen('team')}>Manage team</button>
        </section>
      </div>
    </div>
  )
}

export default SettingsWorkspace
