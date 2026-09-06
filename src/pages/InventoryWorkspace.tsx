import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import WorkspaceShell, { type WorkspaceTab } from '../components/WorkspaceShell'
import { useCurrency } from '../hooks/useCurrency'
import { useProducts } from '../hooks/useProducts'
import { useSettings } from '../hooks/useSettings'
import { useSubscription } from '../hooks/useSubscription'
import type { ProductStatus } from '../types/product'
import Inventory from './Inventory'
import Listings from './Listings'
import Pricing from './Pricing'

type InventoryView =
  | 'all'
  | 'unlisted'
  | 'listed'
  | 'relisting'
  | 'reserved'
  | 'archived'
  | 'pricing'

const statusForView: Partial<Record<InventoryView, ProductStatus>> = {
  unlisted: 'Unlisted',
  relisting: 'Relisting Required',
  reserved: 'Reserved',
  archived: 'Archived',
}

function InventoryWorkspace() {
  const [params, setParams] = useSearchParams()
  const { products } = useProducts()
  const { settings } = useSettings()
  const { canUse } = useSubscription()

  const listingsAvailable = settings.features.listingsEnabled && canUse('listings')
  const allowedViews: InventoryView[] = [
    'all',
    'unlisted',
    ...(listingsAvailable ? ['listed' as const] : []),
    'relisting',
    'reserved',
    'archived',
    'pricing',
  ]

  const requested = params.get('view') as InventoryView | null
  const view: InventoryView = allowedViews.includes(requested as InventoryView)
    ? (requested as InventoryView)
    : 'all'

  const counts = useMemo(() => ({
    unlisted: products.filter((p) => p.status === 'Unlisted').length,
    listed: products.filter((p) => p.status === 'Listed').length,
    relisting: products.filter((p) => p.status === 'Relisting Required').length,
    reserved: products.filter((p) => p.status === 'Reserved').length,
    archived: products.filter((p) => p.status === 'Archived').length,
  }), [products])

  const tabs: WorkspaceTab[] = [
    { id: 'all', label: 'All stock', icon: 'inventory', badge: products.length },
    { id: 'unlisted', label: 'Unlisted', icon: 'package', badge: counts.unlisted },
    ...(listingsAvailable
      ? [{ id: 'listed', label: 'Listed', icon: 'listings' as const, badge: counts.listed }]
      : []),
    { id: 'relisting', label: 'Needs relisting', icon: 'alert', badge: counts.relisting },
    { id: 'reserved', label: 'Reserved', icon: 'clock', badge: counts.reserved },
    { id: 'archived', label: 'Archived', icon: 'reports', badge: counts.archived },
    { id: 'pricing', label: 'Pricing tool', icon: 'wallet' },
  ]

  return (
    <WorkspaceShell
      title="Inventory"
      description="Manage stock from purchase through listing, storage and eventual sale."
      eyebrow="Operations"
      tabs={tabs}
      activeTab={view}
      onTabChange={(next) => setParams(next === 'all' ? {} : { view: next })}
    >
      <div className="workspace-v2-embedded">
        {view === 'all' && <Inventory />}
        {view === 'listed' && listingsAvailable && <Listings />}
        {view === 'pricing' && <Pricing />}
        {statusForView[view] && (
          <InventoryStatusView
            status={statusForView[view] as ProductStatus}
            emptyLabel={tabs.find((tab) => tab.id === view)?.label ?? 'Products'}
          />
        )}
      </div>
    </WorkspaceShell>
  )
}

function InventoryStatusView({
  status,
  emptyLabel,
}: {
  status: ProductStatus
  emptyLabel: string
}) {
  const navigate = useNavigate()
  const { products, loading } = useProducts()
  const { money } = useCurrency()

  const rows = useMemo(
    () => products.filter((product) => product.status === status),
    [products, status],
  )

  const capital = rows.reduce(
    (sum, product) => sum + product.purchasePrice + product.additionalCosts,
    0,
  )
  const listingValue = rows.reduce((sum, product) => sum + (product.listingPrice || 0), 0)

  return (
    <div className="inventory-view-v2">
      <div className="workspace-metric-strip">
        <div><span>Products</span><strong>{rows.length}</strong></div>
        <div><span>Capital</span><strong>{money(capital)}</strong></div>
        <div><span>Listing value</span><strong>{money(listingValue)}</strong></div>
      </div>

      <div className="inventory-table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Brand</th>
              <th>Storage</th>
              <th>Marketplaces</th>
              <th>Cost</th>
              <th>Price</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}><div className="table-empty"><strong>Loading inventory…</strong></div></td></tr>
            ) : rows.length ? (
              rows.map((product) => (
                <tr key={product.id}>
                  <td data-label="Product">
                    <button
                      type="button"
                      className="product-link product-name-link"
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      {product.name}
                    </button>
                    <span className="workspace-table-subline">{product.code}</span>
                  </td>
                  <td data-label="Brand">{product.brand || '—'}</td>
                  <td data-label="Storage">{product.storageLocation || '—'}</td>
                  <td data-label="Marketplaces">
                    {product.marketplaces.length ? product.marketplaces.join(', ') : '—'}
                  </td>
                  <td data-label="Cost">{money(product.purchasePrice + product.additionalCosts)}</td>
                  <td data-label="Price">{money(product.listingPrice || 0)}</td>
                  <td data-label="Status">
                    <span className={`status-badge status-${product.status.toLowerCase().replace(/ /g, '-')}`}>
                      {product.status}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="row-action-link" onClick={() => navigate(`/products/${product.id}`)}>
                      Open
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8}>
                  <div className="inventory-empty-state">
                    <strong>No {emptyLabel.toLowerCase()}</strong>
                    <span>Products matching this inventory view will appear here automatically.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default InventoryWorkspace
