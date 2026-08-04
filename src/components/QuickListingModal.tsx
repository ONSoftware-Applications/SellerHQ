import { useState, type FormEvent } from 'react'

import type { Marketplace, Product } from '../types/product'

type QuickListingModalProps = {
  product: Product
  onClose: () => void
  onSubmit: (updatedProduct: Product) => Promise<void>
}

const marketplaceOptions: Marketplace[] = [
  'eBay',
  'Vinted',
  'Etsy',
  'Depop',
]

export function QuickListingModal({
  product,
  onClose,
  onSubmit,
}: QuickListingModalProps) {
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<
    Marketplace[]
  >(product.marketplaces ?? [])
  const [listingPrice, setListingPrice] = useState(
    product.listingPrice.toString(),
  )
  const [listingDate, setListingDate] = useState(
    product.listingDate ?? new Date().toISOString().split('T')[0],
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function toggleMarketplace(marketplace: Marketplace) {
    setSelectedMarketplaces((current) =>
      current.includes(marketplace)
        ? current.filter((item) => item !== marketplace)
        : [...current, marketplace],
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const numericListingPrice = Number(listingPrice)
    if (!Number.isFinite(numericListingPrice) || numericListingPrice < 0) {
      setError('Listing price must be zero or higher.')
      return
    }

    setSubmitting(true)

    try {
      await onSubmit({
        ...product,
        marketplaces: selectedMarketplaces,
        listingPrice: numericListingPrice,
        listingDate: listingDate || null,
        updatedAt: new Date().toISOString(),
      })
      onClose()
    } catch (err) {
      console.error(err)
      setError('Failed to update listing details. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-listing-title"
      onMouseDown={onClose}
    >
      <div
        className="modal inventory-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="quick-listing-title">Manage Listings</h2>
            <p>
              Update active platforms and price for <strong>{product.name}</strong> ({product.code}).
            </p>
          </div>

          <button
            className="modal-close"
            onClick={onClose}
            type="button"
            disabled={submitting}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="inventory-alert">{error}</div>}

            <div className="inventory-modal-grid">
              <section className="inventory-modal-section inventory-modal-full">
                <h3>Active Marketplaces</h3>
                <div className="inventory-marketplaces">
                  <div className="inventory-marketplace-options">
                    {marketplaceOptions.map((marketplace) => (
                      <label key={marketplace}>
                        <input
                          type="checkbox"
                          checked={selectedMarketplaces.includes(marketplace)}
                          onChange={() => toggleMarketplace(marketplace)}
                          disabled={submitting}
                        />
                        {marketplace}
                      </label>
                    ))}
                  </div>
                </div>
              </section>

              <section className="inventory-modal-section inventory-modal-full">
                <h3>Listing Pricing & Date</h3>
                <div className="inventory-modal-section-grid">
                  <label>
                    Listing Price (£)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={listingPrice}
                      onChange={(event) => setListingPrice(event.target.value)}
                      placeholder="0.00"
                      disabled={submitting}
                    />
                  </label>

                  <label>
                    Listing Date
                    <input
                      type="date"
                      value={listingDate}
                      onChange={(event) => setListingDate(event.target.value)}
                      disabled={submitting}
                    />
                  </label>
                </div>
              </section>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
