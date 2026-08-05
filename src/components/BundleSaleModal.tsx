import { useMemo, useState, type FormEvent } from 'react'

import { useProducts } from '../hooks/useProducts'
import { useCurrency } from '../hooks/useCurrency'
import { useSettings } from '../hooks/useSettings'
import type { Marketplace, Product } from '../types/product'

type BundleItem = {
  product: Product
  salePrice: string
}

type BundleDraft = {
  saleDate: string
  shippingDate: string
  saleMarketplace: Marketplace | ''
  shippingCost: string
  platformFees: string
  otherFees: string
}

type Props = {
  onClose: () => void
  onSaved: () => void
}

function todayValue() {
  return new Date().toISOString().split('T')[0]
}

export function BundleSaleModal({ onClose, onSaved }: Props) {
  const { products, updateProduct } = useProducts()
  const { money } = useCurrency()
  const { settings } = useSettings()

  const saleStatus: Product['status'] = settings.features.shippingFlowEnabled
    ? 'Awaiting Shipping'
    : 'Sold'

  const [search, setSearch] = useState('')
  const [items, setItems] = useState<BundleItem[]>([])

  const [draft, setDraft] = useState<BundleDraft>({
    saleDate: todayValue(),
    shippingDate: '',
    saleMarketplace: '',
    shippingCost: '0',
    platformFees: '0',
    otherFees: '0',
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const availableProducts = useMemo(() => {
    const addedIds = new Set(items.map((item) => item.product.id))
    return products.filter(
      (p) =>
        !['Sold', 'In Shipping', 'Returned', 'Archived'].includes(p.status) &&
        !addedIds.has(p.id),
    )
  }, [products, items])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return availableProducts.slice(0, 20)

    return availableProducts
      .filter((p) => {
        return [p.code, p.name, p.brand, p.sku, p.category]
          .join(' ')
          .toLowerCase()
          .includes(query)
      })
      .slice(0, 20)
  }, [availableProducts, search])

  const shippingCost = Number(draft.shippingCost)
  const platformFees = Number(draft.platformFees)
  const otherFees = Number(draft.otherFees)
  const totalFees = shippingCost + platformFees + otherFees
  const itemCount = items.length
  const feesPerItem = itemCount > 0 ? totalFees / itemCount : 0

  const totals = useMemo(() => {
    let revenue = 0
    let profit = 0
    for (const item of items) {
      const price = Number(item.salePrice)
      const itemProfit = Number.isFinite(price)
        ? price - item.product.purchasePrice - item.product.additionalCosts - feesPerItem
        : 0
      revenue += Number.isFinite(price) ? price : 0
      profit += itemProfit
    }
    return { revenue, profit }
  }, [items, feesPerItem])

  function updateField<K extends keyof BundleDraft>(key: K, value: BundleDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function addItem(product: Product) {
    setItems((prev) => [
      ...prev,
      {
        product,
        salePrice: product.listingPrice?.toString() ?? '',
      },
    ])
    setSearch('')
  }

  function updateItemSalePrice(id: string, salePrice: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === id ? { ...item, salePrice } : item,
      ),
    )
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.product.id !== id))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (items.length === 0) {
      setError('Add at least one product to the bundle.')
      return
    }

    for (const item of items) {
      const price = Number(item.salePrice)
      if (!Number.isFinite(price) || price < 0) {
        setError(`Sale price for ${item.product.name} must be zero or higher.`)
        return
      }
    }

    if (!Number.isFinite(shippingCost) || !Number.isFinite(platformFees) || !Number.isFinite(otherFees)) {
      setError('Fees must be valid numbers.')
      return
    }

    setSaving(true)
    setError('')

    try {
      for (const item of items) {
        const price = Number(item.salePrice)
        const itemProfit = price - item.product.purchasePrice - item.product.additionalCosts - feesPerItem

        await updateProduct({
          ...item.product,
          status: saleStatus,
          salePrice: price,
          saleDate: draft.saleDate || todayValue(),
          shippingDate: draft.shippingDate || null,
          saleMarketplace: draft.saleMarketplace || null,
          shippingCost,
          platformFees,
          otherFees,
          fees: feesPerItem,
          profit: itemProfit,
          updatedAt: new Date().toISOString(),
        })
      }
      onSaved()
    } catch (err) {
      console.error(err)
      setError('Failed to record bundle sale. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal inventory-modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div>
            <h2>Record a bundle sale</h2>
            <p>Mark multiple inventory products as sold in a single sale.</p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}

            <div className="inventory-modal-section">
              <h3>Items in this sale ({items.length})</h3>
              {items.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--shq-ink-muted)', margin: '8px 0 12px' }}>
                  No items yet. Search below to add products to the bundle.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '10px 12px',
                        border: '1px solid var(--shq-border)',
                        borderRadius: 8,
                        background: 'var(--shq-surface)',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{item.product.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--shq-ink-muted)' }}>
                          {item.product.code} &middot; Cost {money(item.product.purchasePrice)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          aria-label={`Sale price for ${item.product.name}`}
                          value={item.salePrice}
                          onChange={(e) => updateItemSalePrice(item.product.id, e.target.value)}
                          style={{ width: 110, padding: '6px 8px', border: '1px solid var(--shq-border)', borderRadius: 6, fontSize: 13, background: 'var(--shq-bg)', color: 'var(--shq-ink)' }}
                        />
                        <button
                          type="button"
                          className="row-action-link"
                          onClick={() => removeItem(item.product.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <input
                type="search"
                placeholder="Search by ID, name, brand, SKU to add an item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              {search.trim().length > 0 && filteredProducts.length === 0 ? (
                <div className="table-empty" style={{ padding: 16 }}>
                  <strong>No products found</strong>
                  <span>Try a different search term.</span>
                </div>
              ) : (
                search.trim().length > 0 && (
                  <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 10 }}>
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="inventory-product-row"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid var(--shq-border)',
                          borderRadius: 8,
                          background: 'var(--shq-surface)',
                          cursor: 'pointer',
                          marginBottom: 6,
                          textAlign: 'left',
                        }}
                        onClick={() => addItem(p)}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--shq-ink-muted)' }}>
                            {p.code} &middot; {p.brand || 'No brand'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--shq-ink-muted)' }}>
                          <div>{money(p.purchasePrice)}</div>
                          <span className={`status-badge status-${p.status.toLowerCase().replaceAll(' ', '-')}`}>
                            {p.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>

            <div className="inventory-modal-section">
              <h3>Sale details</h3>
              <div className="inventory-modal-section-grid">
                <label>
                  <span>Sale date *</span>
                  <input
                    type="date"
                    value={draft.saleDate}
                    onChange={(e) => updateField('saleDate', e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Shipping date</span>
                  <input
                    type="date"
                    value={draft.shippingDate}
                    onChange={(e) => updateField('shippingDate', e.target.value)}
                  />
                </label>
                <label>
                  <span>Sale marketplace</span>
                  <select
                    value={draft.saleMarketplace}
                    onChange={(e) => updateField('saleMarketplace', e.target.value as Marketplace | '')}
                  >
                    <option value="">None</option>
                    <option value="eBay">eBay</option>
                    <option value="Vinted">Vinted</option>
                    <option value="Etsy">Etsy</option>
                    <option value="Depop">Depop</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="inventory-modal-section">
              <h3>Fees (split evenly across {itemCount > 0 ? itemCount : 'items'})</h3>
              <div className="inventory-modal-section-grid">
                <label>
                  <span>Shipping cost</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.shippingCost}
                    onChange={(e) => updateField('shippingCost', e.target.value)}
                  />
                </label>
                <label>
                  <span>Platform fees</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.platformFees}
                    onChange={(e) => updateField('platformFees', e.target.value)}
                  />
                </label>
                <label>
                  <span>Other fees</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.otherFees}
                    onChange={(e) => updateField('otherFees', e.target.value)}
                  />
                </label>
              </div>
            </div>

            {items.length > 0 && (
              <div
                className="inventory-modal-section"
                style={{
                  background: totals.profit >= 0 ? 'var(--shq-success-bg)' : 'var(--shq-error-bg)',
                  border: totals.profit >= 0 ? '1px solid var(--shq-success)' : '1px solid var(--shq-error)',
                }}
              >
                <h3 style={{ margin: '0 0 8px' }}>Bundle summary</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Items sold</span>
                    <strong>{items.length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total sale price</span>
                    <strong>{money(totals.revenue)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total fees ({money(totalFees)})</span>
                    <span style={{ color: 'var(--shq-ink-muted)' }}>per item {money(feesPerItem)}</span>
                  </div>
                  <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid var(--shq-border)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>Total profit</strong>
                    <strong style={{ color: totals.profit >= 0 ? 'var(--shq-success)' : 'var(--shq-error)' }}>
                      {money(totals.profit)}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 0 0' }}>
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Record bundle sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
