import { useMemo, useState, type FormEvent } from 'react'

import { useProducts } from '../hooks/useProducts'
import { useCurrency } from '../hooks/useCurrency'
import { useSettings } from '../hooks/useSettings'
import type { Marketplace, Product } from '../types/product'

type SoldDraft = {
  salePrice: string
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

export function RecordSaleModal({ onClose, onSaved }: Props) {
  const { products, updateProduct } = useProducts()
  const { money } = useCurrency()
  const { settings } = useSettings()

  const saleStatus: Product['status'] = settings.features.shippingFlowEnabled
    ? 'Awaiting Shipping'
    : 'Sold'

  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const [draft, setDraft] = useState<SoldDraft>({
    salePrice: '',
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
    return products.filter(
      (p) => !['Sold', 'In Shipping', 'Returned', 'Archived'].includes(p.status),
    )
  }, [products])

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

  const salePrice = Number(draft.salePrice)
  const shippingCost = Number(draft.shippingCost)
  const platformFees = Number(draft.platformFees)
  const otherFees = Number(draft.otherFees)
  const totalFees = shippingCost + platformFees + otherFees
  const profit = selectedProduct
    ? salePrice - selectedProduct.purchasePrice - selectedProduct.additionalCosts - totalFees
    : 0

  function updateField<K extends keyof SoldDraft>(key: K, value: SoldDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function handleSelectProduct(product: Product) {
    setSelectedProduct(product)
    setSearch('')
    setDraft((prev) => ({
      ...prev,
      salePrice: product.listingPrice?.toString() ?? '',
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!selectedProduct) {
      setError('Please select a product.')
      return
    }

    if (!Number.isFinite(salePrice) || salePrice < 0) {
      setError('Sale price must be zero or higher.')
      return
    }

    if (!Number.isFinite(shippingCost) || !Number.isFinite(platformFees) || !Number.isFinite(otherFees)) {
      setError('Fees must be valid numbers.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const remainingQuantity = Math.max(
        0,
        (selectedProduct.quantity || 1) - 1,
      )

      await updateProduct({
        ...selectedProduct,
        quantity: remainingQuantity,
        status:
          remainingQuantity > 0 ? selectedProduct.status : saleStatus,
        salePrice,
        saleDate: draft.saleDate || todayValue(),
        shippingDate: draft.shippingDate || null,
        saleMarketplace: draft.saleMarketplace || null,
        shippingCost,
        platformFees,
        otherFees,
        fees: totalFees,
        profit,
        updatedAt: new Date().toISOString(),
      })
      onSaved()
    } catch (err) {
      console.error(err)
      setError('Failed to record sale. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal inventory-modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div>
            <h2>Record a sale</h2>
            <p>
              {settings.features.shippingFlowEnabled
                ? 'Log the sale details and mark the product as awaiting shipping.'
                : 'Mark an inventory product as sold and log the financial details.'}
            </p>
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

            {!selectedProduct ? (
              <div className="inventory-modal-section">
                <h3>Select a product</h3>
                <input
                  type="search"
                  placeholder="Search by ID, name, brand, SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
                <div style={{ maxHeight: 260, overflowY: 'auto', marginTop: 12 }}>
                  {filteredProducts.length === 0 ? (
                    <div className="table-empty" style={{ padding: 16 }}>
                      <strong>No products found</strong>
                      <span>Try a different search term.</span>
                    </div>
                  ) : (
                    filteredProducts.map((p) => (
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
                        onClick={() => handleSelectProduct(p)}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--shq-ink-muted)' }}>
                            {p.code} &middot; {p.brand || 'No brand'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--shq-ink-muted)' }}>
                          <div>{money(p.purchasePrice)}</div>
                          <span className={`status-badge status-${p.status.toLowerCase().replace(/ /g, '-')}`}>
                            {p.status}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="inventory-modal-section" style={{ background: 'var(--shq-surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{selectedProduct.name}</h3>
                      <div style={{ fontSize: 12, color: 'var(--shq-ink-muted)' }}>
                        {selectedProduct.code} &middot; {selectedProduct.brand || 'No brand'} &middot; Purchase: {money(selectedProduct.purchasePrice)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => setSelectedProduct(null)}
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div className="inventory-modal-section">
                  <h3>Sale details</h3>
                  <div className="inventory-modal-section-grid">
                    <label>
                      <span>Sale price *</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.salePrice}
                        onChange={(e) => updateField('salePrice', e.target.value)}
                        required
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
                  </div>
                </div>

                <div className="inventory-modal-section">
                  <h3>Fees</h3>
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

                {salePrice > 0 && (
                  <div
                    className="inventory-modal-section"
                    style={{
                      background: profit >= 0 ? 'var(--shq-success-bg)' : 'var(--shq-error-bg)',
                      border: profit >= 0 ? '1px solid var(--shq-success)' : '1px solid var(--shq-error)',
                    }}
                  >
                    <h3 style={{ margin: '0 0 8px' }}>Profit breakdown</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Sale price</span>
                        <strong>{money(salePrice)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Purchase price</span>
                        <span style={{ color: 'var(--shq-ink-muted)' }}>-{money(selectedProduct.purchasePrice)}</span>
                      </div>
                      {selectedProduct.additionalCosts > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Additional costs</span>
                          <span style={{ color: 'var(--shq-ink-muted)' }}>-{money(selectedProduct.additionalCosts)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total fees</span>
                        <span style={{ color: 'var(--shq-ink-muted)' }}>-{money(totalFees)}</span>
                      </div>
                      <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid var(--shq-border)' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>Profit</strong>
                        <strong style={{ color: profit >= 0 ? 'var(--shq-success)' : 'var(--shq-error)' }}>
                          {money(profit)}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 0 0' }}>
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            {selectedProduct && (
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Record sale'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
