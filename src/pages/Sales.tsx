import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useProducts } from '../hooks/useProducts'
import { useCurrency } from '../hooks/useCurrency'
import { downloadCsv } from '../utils/format'
import { useToast } from '../hooks/useToast'
import { useSubscription } from '../hooks/useSubscription'
import { RecordSaleModal } from '../components/RecordSaleModal'
import { BundleSaleModal } from '../components/BundleSaleModal'
import { FilterBar } from '../components/FilterBar'
import { usePagination, PaginationControls } from '../components/Pagination'
import {
  averageProfitPerItem,
  averageSaleValue,
  groupByMarketplace,
  groupByMonth,
  bestPerforming,
  profitMargin,
  revenue,
  grossProfit,
} from '../lib/finance'
const statusOrder: string[] = [
  'Sold',
  'In Shipping',
  'Awaiting Shipping',
  'Listed',
  'Unlisted',
]

const sortLabels: Record<string, string> = {
  createdAt: 'Sale date',
  code: 'Product ID',
  name: 'Name',
  status: 'Status',
  salePrice: 'Sale price',
  profit: 'Profit',
  saleDate: 'Sale date',
  marketplaces: 'Marketplaces',
  shippingDate: 'Shipping date',
}

function Sales() {
  const navigate = useNavigate()
  const { products, loading } = useProducts()
  const { money } = useCurrency()
  const { showToast } = useToast()
  const { canUse } = useSubscription()

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('saleDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [showRecordSale, setShowRecordSale] = useState(false)
  const [showBundleSale, setShowBundleSale] = useState(false)

  const soldProducts = useMemo(() => {
    return products.filter((product) => product.status === 'Sold')
  }, [products])

  const filteredSoldProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    
    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    weekAgo.setHours(0, 0, 0, 0)
    
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    monthAgo.setHours(0, 0, 0, 0)

    return soldProducts.filter((product) => {
      const searchMatch =
        query.length === 0 ||
        [
          product.code,
          product.sku,
          product.name,
          product.brand,
          product.category,
          ...(Array.isArray(product.marketplaces) ? product.marketplaces : []),
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)

      if (!searchMatch) return false

      switch (dateRange) {
        case 'today':
          return product.saleDate === today
        case 'week':
          return product.saleDate && new Date(product.saleDate) >= weekAgo
        case 'month':
          return product.saleDate && new Date(product.saleDate) >= monthAgo
        case 'all':
        default:
          return true
      }
    })
  }, [soldProducts, search, dateRange])

  const sortedSoldProducts = useMemo(() => {
    const sorted = [...filteredSoldProducts].sort((left, right) => {
      let comparison = 0

      switch (sortKey) {
        case 'code':
          comparison = left.code.localeCompare(right.code)
          break
        case 'name':
          comparison = left.name.localeCompare(right.name)
          break
        case 'status':
          comparison = statusOrder.indexOf(left.status) - statusOrder.indexOf(right.status)
          break
        case 'salePrice':
          comparison = (left.salePrice || 0) - (right.salePrice || 0)
          break
        case 'profit':
          comparison = left.profit - right.profit
          break
        case 'saleDate':
          comparison = (left.saleDate || '').localeCompare(right.saleDate || '')
          break
        case 'shippingDate':
          comparison = (left.shippingDate || '').localeCompare(right.shippingDate || '')
          break
        case 'marketplaces':
          const leftMarketplaces = Array.isArray(left.marketplaces) ? left.marketplaces.join(',') : String(left.marketplaces)
          const rightMarketplaces = Array.isArray(right.marketplaces) ? right.marketplaces.join(',') : String(right.marketplaces)
          comparison = leftMarketplaces.localeCompare(rightMarketplaces)
          break
        case 'createdAt':
        default:
          comparison = new Date(left.saleDate || left.createdAt).getTime() - new Date(right.saleDate || right.createdAt).getTime()
          break
      }

      if (sortDirection === 'desc') {
        comparison *= -1
      }

      return comparison
    })

    return sorted
  }, [filteredSoldProducts, sortDirection, sortKey])

  const pagination = usePagination(sortedSoldProducts, 50)

  const totalSalesRevenue = useMemo(() => {
    return soldProducts.reduce((total, product) => total + (product.salePrice || 0), 0)
  }, [soldProducts])

  const totalProfit = useMemo(() => {
    return soldProducts.reduce((total, product) => total + product.profit, 0)
  }, [soldProducts])

  const soldToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return soldProducts.filter((product) => product.saleDate === today).length
  }, [soldProducts])

  const shippingToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return soldProducts.filter((product) => product.shippingDate === today).length
  }, [soldProducts])

  const averageProfitMargin = useMemo(() => {
    if (soldProducts.length === 0) return 0
    const totalRevenue = soldProducts.reduce((total, product) => total + (product.salePrice || 0), 0)
    return (totalProfit / totalRevenue) * 100
  }, [soldProducts, totalProfit])

  const salesAnalytics = useMemo(() => {
    const rev = revenue(soldProducts)
    const prof = grossProfit(soldProducts)
    return {
      avgSale: averageSaleValue(soldProducts),
      avgProfit: averageProfitPerItem(soldProducts),
      margin: profitMargin(rev, prof),
      byMarketplace: groupByMarketplace(soldProducts),
      byMonth: groupByMonth(soldProducts).slice(-6),
      bestBrands: bestPerforming(soldProducts, 'brand').slice(0, 5),
      bestCategories: bestPerforming(soldProducts, 'category').slice(0, 5),
    }
  }, [soldProducts])

  return (
    <div className="inventory-page">
      <div className="page-heading">
        <div>
          <h1>Sales</h1>
          <p>Track and manage your sales performance.</p>
        </div>
        <div className="page-heading-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => setShowRecordSale(true)}
          >
            + Record sale
          </button>
          {canUse('bundleSales') && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowBundleSale(true)}
            >
              + Bundle sale
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => {
              if (soldProducts.length === 0) {
                showToast('No sales to export', 'error')
                return
              }
              downloadCsv('sales.csv', [
                ['Product ID', 'Name', 'Brand', 'Sale price', 'Profit', 'Sale date', 'Marketplace'],
                ...soldProducts.map((p) => [
                  p.code,
                  p.name,
                  p.brand,
                  String(p.salePrice ?? ''),
                  String(p.profit),
                  p.saleDate ?? '',
                  p.saleMarketplace ?? '',
                ]),
              ])
              showToast('Sales exported as CSV', 'success')
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="inventory-stats">
        <div className="inventory-stat inventory-stat-sold">
          <span>Total sales</span>
          <strong>{soldProducts.length}</strong>
        </div>

        <div className="inventory-stat">
          <span>Revenue</span>
          <strong>{money(totalSalesRevenue)}</strong>
        </div>

        <div className="inventory-stat">
          <span>Profit</span>
          <strong>{money(totalProfit)}</strong>
        </div>

        <div className="inventory-stat">
          <span>Sold today</span>
          <strong>{soldToday}</strong>
        </div>

        <div className="inventory-stat">
          <span>Shipping today</span>
          <strong>{shippingToday}</strong>
        </div>

        <div className="inventory-stat">
          <span>Average margin</span>
          <strong>{averageProfitMargin.toFixed(1)}%</strong>
        </div>
      </div>

      {soldProducts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Sales by marketplace</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {salesAnalytics.byMarketplace.map((m) => (
                <div key={m.marketplace} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--shq-border)' }}>
                  <span>{m.marketplace}</span>
                  <div style={{ textAlign: 'right' }}>
                    <strong>{money(m.revenue)}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--shq-ink-muted)' }}>{m.count} sold · {money(m.profit)} profit</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Monthly trend</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {salesAnalytics.byMonth.map((m) => (
                <div key={m.month} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--shq-border)' }}>
                  <span>{m.month}</span>
                  <div style={{ textAlign: 'right' }}>
                    <strong>{money(m.revenue)}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--shq-ink-muted)' }}>{money(m.profit)} profit</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Best brands</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {salesAnalytics.bestBrands.map((b) => (
                <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--shq-border)' }}>
                  <span>{b.name}</span>
                  <div style={{ textAlign: 'right' }}>
                    <strong>{money(b.profit)}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--shq-ink-muted)' }}>{b.count} sold</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <FilterBar
        searchValue={search}
        searchPlaceholder="Search product ID, name, brand, or marketplace"
        onSearchChange={setSearch}
        filtersActive={search.trim().length > 0 || dateRange !== 'all'}
        onClearFilters={() => { setSearch(''); setDateRange('all') }}
      >
        <select
          value={dateRange}
          onChange={(event) => setDateRange(event.target.value as typeof dateRange)}
        >
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>

        <select
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value)}
        >
          {Object.entries(sortLabels).map(([value, label]) => (
            <option key={value} value={value}>
              Sort by {label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="secondary-button"
          onClick={() => setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')}
        >
          {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        </button>
      </FilterBar>

      <div className="inventory-table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Name</th>
              <th>Brand</th>
              <th>Status</th>
              <th>Marketplaces</th>
              <th>Sale price</th>
              <th>Profit</th>
              <th>Sale date</th>
              <th>Shipping date</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10}>
                  <div className="table-empty">
                    <strong>Loading sales...</strong>
                    <span>Retrieving your sold products.</span>
                  </div>
                </td>
              </tr>
            ) : pagination.paginated.length > 0 ? (
              pagination.paginated.map((product) => (
                <tr key={product.id}>
                  <td data-label="Product ID">
                    <button
                      className="product-link"
                      type="button"
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      {product.code}
                    </button>
                  </td>

                  <td data-label="Name">
                    <button
                      className="product-link product-name-link"
                      type="button"
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      {product.name}
                    </button>
                  </td>

                  <td data-label="Brand">{product.brand || '-'}</td>

                  <td data-label="Status">
                    <span className={`status-badge status-${product.status.toLowerCase().replaceAll(' ', '-')}`}>
                      {product.status}
                    </span>
                  </td>

                  <td data-label="Marketplaces">
                    {product.marketplaces.length > 0
                      ? Array.isArray(product.marketplaces)
                        ? product.marketplaces.join(', ')
                        : product.marketplaces
                      : '-'}
                  </td>

                   <td data-label="Sale price">{money(product.salePrice || 0, { maximumFractionDigits: 0 })}</td>

                   <td data-label="Profit">
                     <span className={product.profit >= 0 ? 'inventory-profit-positive' : 'inventory-profit-negative'}>
                       {money(product.profit)}
                     </span>
                  </td>

                  <td data-label="Sale date">{product.saleDate || '-'}</td>

                  <td data-label="Shipping date">{product.shippingDate || '-'}</td>

                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="row-action-link"
                        onClick={() => navigate(`/products/${product.id}`)}
                      >
                        View
                      </button>

                      <button
                        type="button"
                        className="row-action-link"
                        onClick={() => navigate(`/products/${product.id}`)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="row-action-link"
                        onClick={() => navigate(`/products/${product.id}`)}
                      >
                        Duplicate
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10}>
                  <div className="inventory-empty-state">
                    <strong>No sales found</strong>

                    <span>
                      {dateRange !== 'all' || search.trim().length > 0
                        ? 'No sales match your current filters. Try adjusting your search or date range.'
                        : "You haven't sold any products yet. Start selling by listing products in your inventory!"}
                    </span>

                    <div className="inventory-empty-actions">
                      {(dateRange !== 'all' || search.trim().length > 0) && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setDateRange('all')
                            setSearch('')
                          }}
                        >
                          Clear filters
                        </button>
                      )}

                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => navigate('/inventory')}
                      >
                        + Manage inventory
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <PaginationControls
          result={pagination}
          label="sales"
          insideTable
        />
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
    </div>
  )
}

export default Sales