import { useEffect } from 'react'
import { useSettings } from '../hooks/useSettings'
import { useBusiness } from '../hooks/useBusiness'
import { appDisplayName } from '../lib/branding'
import {
  applyBranding,
  applyCompact,
  applyTheme,
  resolveTheme,
} from '../utils/theme'

export function ThemeController() {
  const { settings, loading } = useSettings()
  const { currentBusiness } = useBusiness()

  useEffect(() => {
    if (loading) return
    document.title = appDisplayName(currentBusiness)
  }, [currentBusiness, loading])

  useEffect(() => {
    if (loading) return
    applyTheme(settings.appearance.theme)
    applyBranding(
      currentBusiness?.accent_color ?? null,
      resolveTheme(settings.appearance.theme),
    )
  }, [settings.appearance.theme, currentBusiness?.accent_color, loading])

  useEffect(() => {
    if (loading) return
    applyCompact(settings.appearance.compactMode)
  }, [settings.appearance.compactMode, loading])

  useEffect(() => {
    if (loading || settings.appearance.theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      applyTheme(settings.appearance.theme)
      applyBranding(
        currentBusiness?.accent_color ?? null,
        resolveTheme(settings.appearance.theme),
      )
    }
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [settings.appearance.theme, currentBusiness?.accent_color, loading])

  return null
}
