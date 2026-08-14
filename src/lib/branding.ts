import type { Business } from '../types/business'
import { escapeHtml } from './sanitize'
import sellerhqLogo from '../assets/sellerhq-logo.png'

export const PRODUCT_NAME = 'SellerHQ'
export const SELLERHQ_LOGO = sellerhqLogo

export function isWhiteLabel(business: Business | null | undefined): boolean {
  return Boolean(business?.white_label)
}

export function appDisplayName(
  business: Business | null | undefined,
): string {
  if (isWhiteLabel(business)) {
    return (
      business?.app_name?.trim() ||
      business?.name?.trim() ||
      PRODUCT_NAME
    )
  }
  return PRODUCT_NAME
}

export function labelBrandingEnabled(
  business: Business | null | undefined,
): boolean {
  return Boolean(
    business && isWhiteLabel(business) && business.label_branding,
  )
}

export const PRINT_BRAND_CSS = `
  .print-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 16px;
    padding: 8px 14px;
    background: #fff;
    border: 1px solid #e4e6e9;
    border-radius: 999px;
  }
  .print-brand-logo {
    width: 26px;
    height: 26px;
    object-fit: contain;
    border-radius: 4px;
  }
  .print-brand-name {
    font-size: 13px;
    font-weight: 700;
    color: #17191c;
    letter-spacing: -0.01em;
  }
  @media print {
    .print-brand { border: 0; }
  }
`

export function printBrandingMarkup(
  business: Business | null | undefined,
): string {
  if (!labelBrandingEnabled(business)) return ''
  const name = escapeHtml(appDisplayName(business))
  const logo = business?.logo_url
  return logo
    ? `<div class="print-brand">
         <img src="${escapeHtml(logo)}" alt="${name} logo" class="print-brand-logo" />
         <span class="print-brand-name">${name}</span>
       </div>`
    : `<div class="print-brand"><span class="print-brand-name">${name}</span></div>`
}

export function qrLogoUrl(
  business: Business | null | undefined,
): string {
  if (labelBrandingEnabled(business) && business?.logo_url) {
    return business.logo_url
  }
  return SELLERHQ_LOGO
}

const DEFAULT_THEME_COLOR = '#14213d'
const DEFAULT_ICON = '/icon-192.png'
const DEFAULT_MANIFEST = '/manifest.json'

let activeManifestUrl: string | null = null

function ensureMeta(name: string): HTMLMetaElement {
  let meta = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`,
  )
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', name)
    document.head.appendChild(meta)
  }
  return meta
}

function ensureLink(rel: string): HTMLLinkElement {
  let link = document.head.querySelector<HTMLLinkElement>(
    `link[rel="${rel}"]`,
  )
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', rel)
    document.head.appendChild(link)
  }
  return link
}

function setFavicon(url: string) {
  const icon = ensureLink('icon')
  icon.setAttribute('href', url)
  icon.removeAttribute('type')

  const apple = ensureLink('apple-touch-icon')
  apple.setAttribute('href', url)
}

function buildManifest(business: Business): Record<string, unknown> {
  const name = appDisplayName(business)
  const themeColor = business.accent_color ?? DEFAULT_THEME_COLOR

  const icons = business.logo_url
    ? [
        { src: business.logo_url, sizes: '192x192', purpose: 'any maskable' },
        { src: business.logo_url, sizes: '512x512', purpose: 'any maskable' },
      ]
    : [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ]

  return {
    name,
    short_name: name,
    description: 'Manage your reselling business',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: themeColor,
    orientation: 'any',
    icons,
  }
}

/**
 * Applies white-label branding (title, favicon, theme colour and PWA
 * manifest) for the given business, or restores SellerHQ defaults when the
 * business is not white-labelled.
 */
export function applyWhiteLabel(
  business: Business | null | undefined,
) {
  if (typeof document === 'undefined') return

  const whiteLabel = isWhiteLabel(business)

  document.title = appDisplayName(business)

  ensureMeta('theme-color').setAttribute(
    'content',
    whiteLabel ? (business?.accent_color ?? DEFAULT_THEME_COLOR) : DEFAULT_THEME_COLOR,
  )

  setFavicon(
    whiteLabel ? (business?.logo_url ?? DEFAULT_ICON) : DEFAULT_ICON,
  )

  let manifestHref = DEFAULT_MANIFEST

  if (whiteLabel && business) {
    try {
      if (activeManifestUrl) URL.revokeObjectURL(activeManifestUrl)
      activeManifestUrl = URL.createObjectURL(
        new Blob([JSON.stringify(buildManifest(business))], {
          type: 'application/manifest+json',
        }),
      )
      manifestHref = activeManifestUrl
    } catch {
      manifestHref = DEFAULT_MANIFEST
    }
  } else if (activeManifestUrl) {
    URL.revokeObjectURL(activeManifestUrl)
    activeManifestUrl = null
  }

  ensureLink('manifest').setAttribute('href', manifestHref)
}
