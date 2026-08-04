import { useEffect } from 'react'
import { useSettings } from '../hooks/useSettings'
import { applyTheme } from '../utils/theme'

export function ThemeController() {
  const { settings, loading } = useSettings()

  useEffect(() => {
    if (loading) return
    applyTheme(settings.appearance.theme)
  }, [settings.appearance.theme, loading])

  useEffect(() => {
    if (loading || settings.appearance.theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme(settings.appearance.theme)
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [settings.appearance.theme, loading])

  return null
}