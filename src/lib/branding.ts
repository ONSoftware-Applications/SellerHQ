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
  if (isWhiteLabel(business) && business?.app_name?.trim()) {
    return business.app_name.trim()
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
