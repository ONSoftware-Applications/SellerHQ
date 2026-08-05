import { useEffect } from 'react'

import { useProducts } from '../hooks/useProducts'
import { useSettings } from '../hooks/useSettings'

const RELIST_AFTER_MS = 4 * 7 * 24 * 60 * 60 * 1000

export function AutoRelist() {
  const { products, updateProduct } = useProducts()
  const { settings } = useSettings()

  useEffect(() => {
    if (!settings.features.autoRelistEnabled) return

    const cutoff = Date.now() - RELIST_AFTER_MS
    const toRelist = products.filter(
      (product) =>
        product.status === 'Listed' &&
        product.listingDate &&
        new Date(product.listingDate).getTime() < cutoff,
    )

    if (toRelist.length === 0) return

    const run = async () => {
      for (const product of toRelist) {
        try {
          await updateProduct({
            ...product,
            status: 'Relisting Required',
            updatedAt: new Date().toISOString(),
          })
        } catch (error) {
          console.error('Auto-relist failed:', error)
        }
      }
    }

    void run()
  }, [products, settings.features.autoRelistEnabled, updateProduct])

  return null
}
