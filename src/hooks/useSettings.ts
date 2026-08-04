import { createContext, useContext } from 'react'
import type { UserSettings } from '../context/SettingsContext'

export type SettingsContextType = {
  settings: UserSettings
  loading: boolean
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>
  updateFeature: (
    feature: keyof UserSettings['features'],
    enabled: boolean,
  ) => Promise<void>
  refreshSettings: () => Promise<void>
}

export const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
)

export function useSettings() {
  const context = useContext(SettingsContext)

  if (!context) {
    throw new Error('useSettings must be used inside a SettingsProvider')
  }

  return context
}
