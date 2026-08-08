import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { SettingsContext } from '../hooks/useSettings'
import type { BillingCycle, PlanId } from '../lib/plans'

export type UserSettings = {
  features: {
    multiCurrency: boolean
    forecastsEnabled: boolean
    listingsEnabled: boolean
    expensesEnabled: boolean
    autoRelistEnabled: boolean
    shippingFlowEnabled: boolean
  }
  subscription: {
    plan: PlanId
    billing: BillingCycle
  }
  business: {
    defaultCurrency: string
    businessName: string
    address: string
  }
  notifications: {
    lowStockAlerts: boolean
    taxDeadlines: boolean
  }
  appearance: {
    theme: 'light' | 'dark' | 'system'
    compactMode: boolean
  }
  tax: {
    reservedAmount: number
    filingStatus: 'not-filed' | 'filed'
  }
}

const defaultSettings: UserSettings = {
  features: {
    multiCurrency: false,
    forecastsEnabled: true,
    listingsEnabled: true,
    expensesEnabled: true,
    autoRelistEnabled: true,
    shippingFlowEnabled: true,
  },
  subscription: {
    plan: 'basic',
    billing: 'monthly',
  },
  business: {
    defaultCurrency: 'GBP',
    businessName: '',
    address: '',
  },
  notifications: {
    lowStockAlerts: true,
    taxDeadlines: true,
  },
  appearance: {
    theme: 'light',
    compactMode: false,
  },
  tax: {
    reservedAmount: 0,
    filingStatus: 'not-filed',
  },
}

export function SettingsProvider({
  children,
}: {
  children: ReactNode
}) {
  const { user } = useAuth()

  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)

  const refreshSettings = useCallback(async () => {
    if (!user) {
      setSettings(defaultSettings)
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to load settings:', error)
        setSettings(defaultSettings)
      } else if (data) {
        const stored = data.settings ?? {}
        setSettings({
          features: { ...defaultSettings.features, ...stored.features },
          subscription: { ...defaultSettings.subscription, ...stored.subscription },
          business: { ...defaultSettings.business, ...stored.business },
          notifications: {
            ...defaultSettings.notifications,
            ...stored.notifications,
          },
          appearance: {
            ...defaultSettings.appearance,
            ...stored.appearance,
          },
          tax: { ...defaultSettings.tax, ...stored.tax },
        })
      } else {
        setSettings(defaultSettings)
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      setSettings(defaultSettings)
    } finally {
      setLoading(false)
    }
  }, [user])

  const updateSettings = useCallback(async (partial: Partial<UserSettings>) => {
    if (!user) return

    let previousSettings: UserSettings = defaultSettings

    setSettings((prev) => {
      previousSettings = prev
      return { ...prev, ...partial }
    })

    try {
      const newSettings = { ...previousSettings, ...partial }

      const { error } = await supabase
        .from('user_settings')
        .upsert(
          {
            user_id: user.id,
            settings: newSettings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )

      if (error) {
        console.error('Failed to save settings:', error)
        setSettings(previousSettings)
      }
    } catch (err) {
      console.error('Error saving settings:', err)
      setSettings(previousSettings)
    }
  }, [user])

  const updateFeature = useCallback(async (feature: keyof UserSettings['features'], enabled: boolean) => {
    setSettings((prev) => {
      const newFeatures = { ...prev.features, [feature]: enabled }
      updateSettings({ features: newFeatures })
      return { ...prev, features: newFeatures }
    })
  }, [updateSettings])

  useEffect(() => {
    refreshSettings()
  }, [refreshSettings])

  const value = useMemo(
    () => ({
      settings,
      loading,
      updateSettings,
      updateFeature,
      refreshSettings,
    }),
    [settings, loading, updateSettings, updateFeature, refreshSettings],
  )

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}


