import type { Product, ProductStatus } from '../types/product'
import type {
  CustomProductStatus,
  CustomStatusColour,
} from '../types/customStatus'

export const SYSTEM_PRODUCT_STATUSES: Exclude<ProductStatus, 'Custom'>[] = [
  'Unlisted',
  'Draft',
  'Listed',
  'Awaiting Shipping',
  'In Shipping',
  'Sold',
  'Reserved',
  'Issue',
  'Relisting Required',
  'Removed',
  'Returned',
  'Archived',
]

export const CUSTOM_STATUS_COLOURS: Array<{
  id: CustomStatusColour
  label: string
  background: string
  colour: string
  border: string
}> = [
  { id: 'slate', label: 'Slate', background: '#f1f5f9', colour: '#475569', border: '#cbd5e1' },
  { id: 'blue', label: 'Blue', background: '#eff6ff', colour: '#1d4ed8', border: '#bfdbfe' },
  { id: 'indigo', label: 'Indigo', background: '#eef2ff', colour: '#4338ca', border: '#c7d2fe' },
  { id: 'purple', label: 'Purple', background: '#faf5ff', colour: '#7e22ce', border: '#e9d5ff' },
  { id: 'pink', label: 'Pink', background: '#fdf2f8', colour: '#be185d', border: '#fbcfe8' },
  { id: 'red', label: 'Red', background: '#fef2f2', colour: '#b91c1c', border: '#fecaca' },
  { id: 'orange', label: 'Orange', background: '#fff7ed', colour: '#c2410c', border: '#fed7aa' },
  { id: 'amber', label: 'Amber', background: '#fffbeb', colour: '#b45309', border: '#fde68a' },
  { id: 'green', label: 'Green', background: '#f0fdf4', colour: '#15803d', border: '#bbf7d0' },
  { id: 'teal', label: 'Teal', background: '#f0fdfa', colour: '#0f766e', border: '#99f6e4' },
]

export function customStatusDatabaseValue(id: string): string {
  return `custom:${id}`
}

export function customStatusIdFromDatabaseValue(value: string): string | null {
  return value.startsWith('custom:') ? value.slice('custom:'.length) || null : null
}

export function getCustomStatus(
  product: Pick<Product, 'status' | 'customStatusId'>,
  statuses: CustomProductStatus[],
): CustomProductStatus | undefined {
  if (product.status !== 'Custom' || !product.customStatusId) return undefined
  return statuses.find((status) => status.id === product.customStatusId)
}

export function getProductStatusLabel(
  product: Pick<Product, 'status' | 'customStatusId'>,
  statuses: CustomProductStatus[],
): string {
  if (product.status !== 'Custom') return product.status
  return getCustomStatus(product, statuses)?.name ?? 'Custom status'
}

export function getCustomStatusStyle(colour: CustomStatusColour) {
  const option = CUSTOM_STATUS_COLOURS.find((item) => item.id === colour)
    ?? CUSTOM_STATUS_COLOURS[0]

  return {
    backgroundColor: option.background,
    color: option.colour,
    borderColor: option.border,
  }
}
