import Toggle from '../components/Toggle'
import { useSettings } from '../hooks/useSettings'
import { useSubscription } from '../hooks/useSubscription'
import { useToast } from '../hooks/useToast'
import type { Theme } from '../utils/theme'

function SettingsPreferencesV2() {
  const { settings, loading, updateFeature, updateSettings } = useSettings()
  const { canUse } = useSubscription()
  const { showToast } = useToast()

  if (loading) {
    return (
      <div className="inventory-loading" style={{ minHeight: 260 }}>
        <div className="inventory-spinner" />
        <span>Loading preferences…</span>
      </div>
    )
  }

  async function setFeature(
    feature: keyof typeof settings.features,
    enabled: boolean,
    label: string,
  ) {
    await updateFeature(feature, enabled)
    showToast(`${label} ${enabled ? 'enabled' : 'disabled'}`, 'success')
  }

  return (
    <div className="settings-preferences-v2">
      <div className="settings-preferences-grid-v2">
        <section className="panel-v2 settings-section-v2">
          <header className="panel-v2-header">
            <div>
              <h2>Workspace modules</h2>
              <p>Choose which optional workflows appear throughout SellerHQ.</p>
            </div>
          </header>
          <div className="settings-toggle-list-v2">
            {canUse('listings') && (
              <PreferenceToggle
                checked={settings.features.listingsEnabled}
                label="Marketplace listings"
                description="Adds Listed views and listing-specific workflows to Inventory."
                onChange={(value) => void setFeature('listingsEnabled', value, 'Listings')}
              />
            )}
            {canUse('forecasts') && (
              <PreferenceToggle
                checked={settings.features.forecastsEnabled}
                label="Forecasting"
                description="Shows forecast and scenario tools inside Analytics."
                onChange={(value) => void setFeature('forecastsEnabled', value, 'Forecasting')}
              />
            )}
            <PreferenceToggle
              checked={settings.features.expensesEnabled}
              label="Expense tracking"
              description="Adds the Expenses ledger and expense calculations to Finance."
              onChange={(value) => void setFeature('expensesEnabled', value, 'Expense tracking')}
            />
            <PreferenceToggle
              checked={settings.features.receiptsEnabled}
              label="Receipt inbox"
              description="Stores receipt images and PDFs inside the Finance workspace."
              onChange={(value) => void setFeature('receiptsEnabled', value, 'Receipt inbox')}
            />
          </div>
        </section>

        <section className="panel-v2 settings-section-v2">
          <header className="panel-v2-header">
            <div>
              <h2>Inventory workflow</h2>
              <p>Control how stock moves between listing and fulfilment states.</p>
            </div>
          </header>
          <div className="settings-toggle-list-v2">
            {canUse('autoRelist') && (
              <PreferenceToggle
                checked={settings.features.autoRelistEnabled}
                label="Auto-relist after four weeks"
                description="Marks stale listed products as needing relisting."
                onChange={(value) => void setFeature('autoRelistEnabled', value, 'Auto-relist')}
              />
            )}
            <PreferenceToggle
              checked={settings.features.shippingFlowEnabled}
              label="Shipping status flow"
              description="Sales move through Awaiting dispatch and Shipped before completion."
              onChange={(value) => void setFeature('shippingFlowEnabled', value, 'Shipping flow')}
            />
            {canUse('tillMode') && (
              <PreferenceToggle
                checked={settings.features.tillModeEnabled}
                label="Till mode"
                description="Shows the dedicated point-of-sale workspace in navigation."
                onChange={(value) => void setFeature('tillModeEnabled', value, 'Till mode')}
              />
            )}
          </div>
        </section>

        <section className="panel-v2 settings-section-v2">
          <header className="panel-v2-header">
            <div>
              <h2>Appearance</h2>
              <p>Personal display preferences for SellerHQ.</p>
            </div>
          </header>
          <div className="settings-preference-fields-v2">
            <label className="settings-field-v2">
              <span>Theme</span>
              <select
                value={settings.appearance.theme}
                onChange={async (event) => {
                  await updateSettings({
                    appearance: {
                      ...settings.appearance,
                      theme: event.target.value as Theme,
                    },
                  })
                  showToast('Theme updated', 'success')
                }}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">Use system setting</option>
              </select>
            </label>
            <PreferenceToggle
              checked={settings.appearance.compactMode}
              label="Compact tables"
              description="Reduce spacing in data-heavy workspaces."
              onChange={async (value) => {
                await updateSettings({
                  appearance: { ...settings.appearance, compactMode: value },
                })
                showToast(value ? 'Compact mode enabled' : 'Compact mode disabled', 'success')
              }}
            />
          </div>
        </section>

        <section className="panel-v2 settings-section-v2">
          <header className="panel-v2-header">
            <div>
              <h2>Notifications</h2>
              <p>Choose which SellerHQ reminders should be surfaced.</p>
            </div>
          </header>
          <div className="settings-toggle-list-v2">
            <PreferenceToggle
              checked={settings.notifications.lowStockAlerts}
              label="Low-stock alerts"
              description="Flag stock that has fallen to its reorder level."
              onChange={(value) =>
                void updateSettings({
                  notifications: {
                    ...settings.notifications,
                    lowStockAlerts: value,
                  },
                })
              }
            />
            <PreferenceToggle
              checked={settings.notifications.taxDeadlines}
              label="Tax reminders"
              description="Surface relevant tax-planning reminders inside SellerHQ."
              onChange={(value) =>
                void updateSettings({
                  notifications: {
                    ...settings.notifications,
                    taxDeadlines: value,
                  },
                })
              }
            />
          </div>
        </section>

        {canUse('tillMode') && (
          <section className="panel-v2 settings-section-v2 settings-section-v2-wide">
            <header className="panel-v2-header">
              <div>
                <h2>Point of sale</h2>
                <p>Defaults used by Till mode when calculating and printing transactions.</p>
              </div>
            </header>
            <div className="settings-form-grid-v2">
              <label>
                <span>Sales tax rate (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.till.taxRate}
                  onChange={(event) =>
                    void updateSettings({
                      till: {
                        ...settings.till,
                        taxRate: Number(event.target.value) || 0,
                      },
                    })
                  }
                />
              </label>
              <label>
                <span>Receipt footer</span>
                <input
                  type="text"
                  value={settings.till.receiptFooter}
                  placeholder="Thank you for your purchase"
                  onChange={(event) =>
                    void updateSettings({
                      till: {
                        ...settings.till,
                        receiptFooter: event.target.value,
                      },
                    })
                  }
                />
              </label>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function PreferenceToggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean
  label: string
  description: string
  onChange: (value: boolean) => void
}) {
  return (
    <div className="settings-toggle-row-v2">
      <div>
        <strong>{label}</strong>
        <span>{description}</span>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  )
}

export default SettingsPreferencesV2
