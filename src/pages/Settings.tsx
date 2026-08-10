import { useNavigate } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { useSubscription } from '../hooks/useSubscription'
import { getPlan } from '../lib/plans'
import type { Theme } from '../utils/theme'

function Settings() {
  const navigate = useNavigate()
  const { settings, loading, updateFeature, updateSettings } = useSettings()
  const { showToast } = useToast()
  const { user } = useAuth()
  const { plan: currentPlanId, billing: currentBilling, canUse } = useSubscription()

  const currentPlan = getPlan(currentPlanId)

  function saveSuccess(message: string) {
    showToast(message, 'success')
  }

  function Toggle({
    checked,
    onChange,
    label,
  }: {
    checked: boolean
    onChange: (value: boolean) => void
    label: string
  }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--shq-ink)' }}>{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          style={{
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            background: checked ? 'var(--shq-success)' : '#d1d5db',
            transition: 'background 0.2s ease',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '3px',
              left: checked ? '23px' : '3px',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'var(--shq-surface)',
              transition: 'left 0.2s ease',
            }}
          />
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="inventory-page">
        <div className="page-heading">
          <div>
            <h1>Settings</h1>
            <p>Loading your preferences...</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--shq-ink-muted)' }}>
          <p>Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="inventory-page">
      <div className="page-heading">
        <div>
          <h1>Settings</h1>
          <p>Manage your account, business, and feature preferences.</p>
        </div>
      </div>

      {/* Your plan */}
      <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: 'var(--shq-ink)' }}>
            Your plan: {currentPlan.name}
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--shq-ink-muted)' }}>
            {currentPlan.monthlyPrice === 0
              ? 'Free plan · upgrade for more products, features and automation.'
              : `${currentPlan.name} plan · ${currentBilling === 'annual' ? 'billed annually' : 'billed monthly'}.`}
          </p>
        </div>
        <button className="primary-button" onClick={() => navigate('/subscriptions')}>
          Manage subscription
        </button>
      </div>

      {/* Quick links */}
      <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: 'var(--shq-ink)' }}>
          Quick links
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--shq-ink-muted)' }}>
          Pages moved out of the sidebar. Open them directly from here.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {canUse('reports') && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate('/reports')}
              style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', height: 'auto' }}
            >
              Reports
            </button>
          )}
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/team')}
            style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', height: 'auto' }}
          >
            Team
          </button>
        </div>
      </div>

      {/* Features */}
      <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: 'var(--shq-ink)' }}>
          Optional Features
        </h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--shq-ink-muted)' }}>
          Enable or disable optional modules. Disabled features are hidden from navigation and won't be calculated.
        </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', border: '1px solid var(--shq-border)', borderRadius: '8px' }}>
            <Toggle
              checked={settings.features.listingsEnabled}
              onChange={async (value) => {
                await updateFeature('listingsEnabled', value)
                saveSuccess(value ? 'Listings module enabled' : 'Listings module disabled')
              }}
              label="Listings module"
            />
            <p style={{ margin: '-8px 0 0 0', fontSize: '12px', color: 'var(--shq-ink-muted)' }}>
              Show the Listings page for managing marketplace listings.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', border: '1px solid var(--shq-border)', borderRadius: '8px' }}>
            <Toggle
              checked={settings.features.forecastsEnabled}
              onChange={async (value) => {
                await updateFeature('forecastsEnabled', value)
                saveSuccess(value ? 'Forecasts module enabled' : 'Forecasts module disabled')
              }}
              label="Forecasts module"
            />
            <p style={{ margin: '-8px 0 0 0', fontSize: '12px', color: 'var(--shq-ink-muted)' }}>
              Show the Forecasts page with sales predictions and business health metrics.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', border: '1px solid var(--shq-border)', borderRadius: '8px' }}>
            <Toggle
              checked={settings.features.expensesEnabled}
              onChange={async (value) => {
                await updateFeature('expensesEnabled', value)
                saveSuccess(value ? 'Expenses module enabled' : 'Expenses module disabled')
              }}
              label="Expenses module"
            />
            <p style={{ margin: '-8px 0 0 0', fontSize: '12px', color: 'var(--shq-ink-muted)' }}>
              Show the Expenses page for tracking business expenses and fee breakdowns.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', border: '1px solid var(--shq-border)', borderRadius: '8px' }}>
            <Toggle
              checked={settings.features.receiptsEnabled}
              onChange={async (value) => {
                await updateFeature('receiptsEnabled', value)
                saveSuccess(value ? 'Receipts Archive enabled' : 'Receipts Archive disabled')
              }}
              label="Receipts Archive module"
            />
            <p style={{ margin: '-8px 0 0 0', fontSize: '12px', color: 'var(--shq-ink-muted)' }}>
              Show the Receipts Archive page for storing purchase receipts separately from expenses.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', border: '1px solid var(--shq-border)', borderRadius: '8px' }}>
            <Toggle
              checked={settings.features.autoRelistEnabled}
              onChange={async (value) => {
                await updateFeature('autoRelistEnabled', value)
                saveSuccess(value ? 'Auto-relist enabled' : 'Auto-relist disabled')
              }}
              label="Auto-relist after 4 weeks"
            />
            <p style={{ margin: '-8px 0 0 0', fontSize: '12px', color: 'var(--shq-ink-muted)' }}>
              Automatically change listed products to "Relisting Required" once they have been listed for 4 weeks.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', border: '1px solid var(--shq-border)', borderRadius: '8px' }}>
            <Toggle
              checked={settings.features.shippingFlowEnabled}
              onChange={async (value) => {
                await updateFeature('shippingFlowEnabled', value)
                saveSuccess(value ? 'Shipping status flow enabled' : 'Shipping status flow disabled')
              }}
              label="Shipping status flow"
            />
            <p style={{ margin: '-8px 0 0 0', fontSize: '12px', color: 'var(--shq-ink-muted)' }}>
              Record sales as "Awaiting Shipping", move to "In Shipping" when shipped, then confirm shipping to mark the product as sold. Disable to mark sales as sold immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Business */}
      <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: 'var(--shq-ink)' }}>
          Business
        </h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--shq-ink-muted)' }}>
          Default currency and business details.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--shq-ink)' }}>
              Default currency
            </label>
            {canUse('multiCurrency') ? (
              <select
                value={settings.business.defaultCurrency}
                onChange={async (e) => {
                  await updateSettings({ business: { ...settings.business, defaultCurrency: e.target.value } })
                  saveSuccess('Default currency updated')
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--shq-border)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'var(--shq-surface)',
                }}
              >
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid var(--shq-border)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'var(--shq-surface-muted)',
                  color: 'var(--shq-ink-muted)',
                }}>
                  GBP (£)
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => navigate('/subscriptions')}
                  style={{ padding: '10px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
                >
                  Upgrade
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: 'var(--shq-ink)' }}>
          Appearance
        </h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--shq-ink-muted)' }}>
          Choose how SellerHQ looks.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--shq-ink)' }}>
              Theme
            </label>
            <select
              value={settings.appearance.theme}
              onChange={async (e) => {
                await updateSettings({ appearance: { ...settings.appearance, theme: e.target.value as Theme } })
                saveSuccess('Theme updated')
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--shq-border)',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'var(--shq-surface)',
              }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>

          <div style={{ padding: '16px 0' }}>
            <Toggle
              checked={settings.appearance.compactMode}
              onChange={async (value) => {
                await updateSettings({ appearance: { ...settings.appearance, compactMode: value } })
                saveSuccess(value ? 'Compact mode enabled' : 'Compact mode disabled')
              }}
              label="Compact mode"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: 'var(--shq-ink)' }}>
          Notifications
        </h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--shq-ink-muted)' }}>
          Choose which notifications you'd like to receive.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <Toggle
            checked={settings.notifications.lowStockAlerts}
            onChange={(value) => updateSettings({ notifications: { ...settings.notifications, lowStockAlerts: value } })}
            label="Low stock alerts"
          />
          <Toggle
            checked={settings.notifications.taxDeadlines}
            onChange={(value) => updateSettings({ notifications: { ...settings.notifications, taxDeadlines: value } })}
            label="Tax deadline reminders"
          />
        </div>
      </div>

      {/* Account */}
      <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: 'var(--shq-ink)' }}>
          Account
        </h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--shq-ink-muted)' }}>
          Your account information.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--shq-ink)', color: 'var(--shq-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600' }}>
              {(user?.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--shq-ink)' }}>
                {user?.user_metadata?.full_name || user?.email || 'Account'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--shq-ink-muted)' }}>{user?.email}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings