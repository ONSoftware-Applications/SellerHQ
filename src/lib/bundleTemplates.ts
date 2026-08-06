import { uuid } from '../utils/uuid'

export type BundleTemplate = {
  id: string
  name: string
  createdAt: string
  items: { productId: string; salePrice: string }[]
  saleMarketplace: string
  shippingCost: string
  platformFees: string
  otherFees: string
}

const STORAGE_KEY = 'sellerhq.bundleTemplates'

export function loadBundleTemplates(): BundleTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as BundleTemplate[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveBundleTemplate(
  template: Omit<BundleTemplate, 'id' | 'createdAt'>,
): BundleTemplate {
  const templates = loadBundleTemplates()
  const created: BundleTemplate = {
    ...template,
    id: uuid(),
    createdAt: new Date().toISOString(),
  }
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([created, ...templates]),
  )
  return created
}

export function deleteBundleTemplate(id: string): void {
  const templates = loadBundleTemplates().filter((t) => t.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}
