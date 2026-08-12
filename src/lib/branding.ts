import type { Business } from '../types/business'

export const PRODUCT_NAME = 'SellerHQ'

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
