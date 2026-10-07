import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { BundleSaleModal } from '../components/BundleSaleModal'
import Icon from '../components/Icon'
import { RecordSaleModal } from '../components/RecordSaleModal'
import WorkspaceShell, { type WorkspaceTab } from '../components/WorkspaceShell'
import { useCurrency } from '../hooks/useCurrency'
import { useSales } from '../hooks/useSales'
import { useSubscription } from '../hooks/useSubscription'
import { useToast } from '../hooks/useToast'
import type { Sale } from '../types/sale'

type OrdersView = 'action' | 'awaiting' | 'shipping' | 'completed' | 'refunded'

function OrdersSales() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const {
    sales,
    loading,
    updateSaleStatus,
  } = useSales()
  const { money } = useCurrency()
  const { canUse } = useSubscription()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [showRecordSale, setShowRecordSale] = useState(false)
  const [showBundleSale, setShowBundleSale] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  const requested = params.get('view') as OrdersView | null
  const view: OrdersView = [
    'action',
    'awaiting',
    'shipping',
    'completed',
    'refunded',
  ].includes(requested ?? '')
    ? (requested as OrdersView)
    : 'action'

  const activeSales = sales.filter((sale) => sale.status !== 'Voided')
  const awaiting = activeSales.filter(
    (sale) => sale.status === 'Awaiting Shipping' && !sale.refunded,
  )
  const shipping = activeSales.filter(
    (sale) => sale.status === 'In Shipping' && !sale.refunded,
  )
  const completed = activeSales.filter(
    (sale) => sale.status === 'Sold' && !sale.refunded,
  )
  const refunded = activeSales.filter(
    (sale) => sale.refunded || sale.status === 'Refunded',
  )

  const tabs: WorkspaceTab[] = [
    {
      id: 'action',
      label: 'Needs action',
      icon: 'alert',
      badge: awaiting.length + shipping.length,
    },
    {
      id: 'awaiting',
      label: 'Awaiting dispatch',
      icon: 'package',
      badge: awaiting.length,
    },
    {
      id: 'shipping',
      label: 'Shipped',
      icon: 'truck',
      badge: shipping.length,
    },
    {
      id: 'completed',
      label: 'Completed',
      icon: 'check',
      badge: completed.length,
    },
    {
      id: 'refunded',
      label: 'Refunded',
      icon: 'trend-down',
      badge: refunded.length,
    },
  ]

  const rows = useMemo(() => {
    let source: Sale[]
    if (view === 'awaiting') source = awaiting
    else if (view === 'shipping') source = shipping
    else if (view === 'completed') source = completed
    else if (view === 'refunded') source = refunded
    else source = [...awaiting, ...shipping]

    const query = search.trim().toLowerCase()

    return [...source]
      .filter((sale) =>
        !query
        || [
          sale.productCode,
          sale.productName,
          sale.brand,
          sale.saleMarketplace,
          sale.sku,
        ].join(' ').toLowerCase().includes(query),
      )
      .sort(
        (a, b) =>
          new Date(b.saleDate || b.updatedAt).getTime()
          - new Date(a.saleDate || a.updatedAt).getTime(),
      )
  }, [awaiting, completed, refunded, search, shipping, view])

  const completedRevenue = completed.reduce(
    (sum, sale) => sum + sale.salePrice,
    0,
  )
  const completedProfit = completed.reduce(
    (sum, sale) => sum + sale.profit,
    0,
  )
  const pipelineValue = [...awaiting, ...shipping].reduce(
    (sum, sale) => sum + sale.salePrice,
    0,
  )

  async function progressOrder(sale: Sale) {
    setSavingId(sale.id)

    try {
      if (sale.status === 'Awaiting Shipping') {
        await updateSaleStatus(
          sale.id,
          'In Shipping',
          sale.shippingDate
            || new Date().toISOString().split('T')[0],
        )
        showToast(`${sale.productCode} marked as shipped`, 'success')
      } else if (sale.status === 'In Shipping') {
        await updateSaleStatus(sale.id, 'Sold')
        showToast(`${sale.productCode} completed`, 'success')
      }
    } catch (error) {
      console.error(error)
      showToast('The order could not be updated.', 'error')
    } finally {
      setSavingId(null)
    }
  }

  function openProduct(sale: Sale) {
    if (sale.productId) {
      navigate(`/products/${sale.productId}`)
    }
  }

  return (
    <WorkspaceShell
      title="Orders & Sales"
      description="Move sold stock through dispatch, shipping, completion and refunds."
      eyebrow="Operations"
      tabs={tabs}
      activeTab={view}
      onTabChange={(next) =>
        setParams(next === 'action' ? {} : { view: next })
      }
      actions={
        <>
          {canUse('bundleSales') && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowBundleSale(true)}
            >
              Bundle sale
            </button>
          )}
          <button
            type="button"
            className="primary-button"
            onClick={() => setShowRecordSale(true)}
          >
            <Icon name="plus" size={15} /> Record sale
          </button>
        </>
      }
    >
      <div className="workspace-metric-strip workspace-metric-strip-4">
        <div>
          <span>Needs action</span>
          <strong>{awaiting.length + shipping.length}</strong>
        </div>
        <div>
          <span>Pipeline value</span>
          <strong>{money(pipelineValue)}</strong>
        </div>
        <div>
          <span>Completed revenue</span>
          <strong>{money(completedRevenue)}</strong>
        </div>
        <div>
          <span>Completed profit</span>
          <strong>{money(completedProfit)}</strong>
        </div>
      </div>

      <div className="workspace-toolbar-v2">
        <div className="workspace-search-v2">
          <Icon name="search" size={15} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search order, product, marketplace or SKU"
          />
        </div>
      </div>

      <div className="inventory-table-wrapper orders-table-v2">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Order / product</th>
              <th>Marketplace</th>
              <th>Sale</th>
              <th>Profit</th>
              <th>Sale date</th>
              <th>Status</th>
              <th>Next action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="table-empty">
                    <strong>Loading orders…</strong>
                  </div>
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((sale) => (
                <tr key={sale.id}>
                  <td data-label="Order / product">
                    <button
                      type="button"
                      className="product-link product-name-link"
                      onClick={() => openProduct(sale)}
                      disabled={!sale.productId}
                    >
                      {sale.productName}
                    </button>
                    <span className="workspace-table-subline">
                      {sale.productCode} · {sale.brand || 'No brand'}
                      {sale.quantity > 1 ? ` · ${sale.quantity} units` : ''}
                    </span>
                  </td>
                  <td data-label="Marketplace">
                    {sale.saleMarketplace || 'Direct / not set'}
                  </td>
                  <td data-label="Sale">{money(sale.salePrice)}</td>
                  <td data-label="Profit">
                    <span
                      className={
                        sale.profit >= 0
                          ? 'inventory-profit-positive'
                          : 'inventory-profit-negative'
                      }
                    >
                      {money(sale.profit)}
                    </span>
                  </td>
                  <td data-label="Sale date">
                    {sale.saleDate
                      ? new Date(sale.saleDate).toLocaleDateString('en-GB')
                      : '—'}
                  </td>
                  <td data-label="Status">
                    <span
                      className={`status-badge status-${
                        sale.refunded
                          ? 'issue'
                          : sale.status.toLowerCase().replace(/ /g, '-')
                      }`}
                    >
                      {sale.refunded ? 'Refunded' : sale.status}
                    </span>
                  </td>
                  <td data-label="Next action">
                    {sale.status === 'Awaiting Shipping' && !sale.refunded ? (
                      <button
                        type="button"
                        className="primary-button workspace-table-action"
                        onClick={() => void progressOrder(sale)}
                        disabled={savingId === sale.id}
                      >
                        {savingId === sale.id ? 'Saving…' : 'Mark shipped'}
                      </button>
                    ) : sale.status === 'In Shipping' && !sale.refunded ? (
                      <button
                        type="button"
                        className="primary-button workspace-table-action"
                        onClick={() => void progressOrder(sale)}
                        disabled={savingId === sale.id}
                      >
                        {savingId === sale.id ? 'Saving…' : 'Complete'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="row-action-link"
                        onClick={() => openProduct(sale)}
                        disabled={!sale.productId}
                      >
                        View sale
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
                  <div className="inventory-empty-state">
                    <strong>No orders in this view</strong>
                    <span>
                      Sales will move through these stages as you record and fulfil them.
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showRecordSale && (
        <RecordSaleModal
          onClose={() => setShowRecordSale(false)}
          onSaved={() => {
            setShowRecordSale(false)
            showToast('Sale recorded', 'success')
          }}
        />
      )}

      {showBundleSale && (
        <BundleSaleModal
          onClose={() => setShowBundleSale(false)}
          onSaved={() => {
            setShowBundleSale(false)
            showToast('Bundle sale recorded', 'success')
          }}
        />
      )}
    </WorkspaceShell>
  )
}

export default OrdersSales
