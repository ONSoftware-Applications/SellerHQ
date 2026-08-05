import { useEffect } from 'react'

export type Theme = 'light' | 'dark' | 'system'

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return theme
}

export function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme)
  document.documentElement.setAttribute('data-theme', resolved)
}

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return null
  const int = parseInt(clean, 16)
  if (Number.isNaN(int)) return null
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

function mix(hex: string, target: [number, number, number], weight: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const [r, g, b] = rgb
  const out = [
    clamp(r + (target[0] - r) * weight),
    clamp(g + (target[1] - g) * weight),
    clamp(b + (target[2] - b) * weight),
  ]
  return `rgb(${out[0]}, ${out[1]}, ${out[2]})`
}

const WHITE: [number, number, number] = [255, 255, 255]
const BLACK: [number, number, number] = [0, 0, 0]

export function applyBranding(accent: string | null, theme: 'light' | 'dark') {
  const root = document.documentElement
  const props = [
    '--shq-accent',
    '--shq-accent-hover',
    '--shq-accent-soft',
    '--shq-accent-muted',
  ] as const

  if (!accent || !hexToRgb(accent)) {
    for (const prop of props) root.style.removeProperty(prop)
    return
  }

  const base = theme === 'dark' ? BLACK : WHITE
  root.style.setProperty('--shq-accent', accent)
  root.style.setProperty(
    '--shq-accent-hover',
    mix(accent, base, theme === 'dark' ? 0.25 : 0.12),
  )
  root.style.setProperty(
    '--shq-accent-soft',
    mix(accent, base, theme === 'dark' ? 0.88 : 0.9),
  )
  root.style.setProperty(
    '--shq-accent-muted',
    mix(accent, base, theme === 'dark' ? 0.6 : 0.65),
  )
}

export function applyCompact(compact: boolean) {
  document.documentElement.setAttribute(
    'data-compact',
    compact ? 'true' : 'false',
  )
}

export function useTheme(theme: Theme) {
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme(theme)
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [theme])
}