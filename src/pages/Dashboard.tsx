import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useProducts } from '../hooks/useProducts'
import { useBusiness } from '../hooks/useBusiness'
import { useSettings } from '../hooks/useSettings'
import { useExpenses } from '../hooks/useExpenses'
import { useCurrency } from '../hooks/useCurrency'
import { formatDate } from '../utils/format'
import type { Marketplace } from '../types/product'
import LoadingState from '../components/LoadingState'
import { FilterBar } from '../components/FilterBar'
import {
  type Period,
  periodRange,
  soldInPeriod,
  expensesInPeriod,
  revenue,
  grossProfit,
  expenseTotal,
  netProfit,
  profitMargin,
  averageSaleValue,
  averageProfitPerItem,
  sellThroughRate,
  inventoryCapitalTiedUp,
  potentialRevenue,
  potentialGrossProfit,
  stockAgeingBuckets,
  needsAttention,
  taxEstimate,
  groupByMarketplace,
  bestPerforming,
} from '../lib/finance'

const PERIOD_TABS: Period[] = ['today', 'week', 'month', 'year', 'all']

function Dashboard() {
  const navigate = useNavigate()
  const { products, loading } = useProducts()
  const { currentBusiness } = useBusiness()
  const { settings } = useSettings()
  const { expenses } = useExpenses()
  const { money } = useCurrency()
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<Period>('month')

  const stats = useMemo(() => {
    const totalProducts = products.length
    const unlisted = products.filter(p => p.status === 'Unlisted').length
    const listed = products.filter(p => p.status === 'Listed').length
    const awaitingShipping = products.filter(p => p.status === 'Awaiting Shipping').length
    const sold = products.filter(p => p.status === 'Sold').length

    const soldProducts = products.filter(p => p.status === 'Sold' && p.salePrice !== null)
    const totalRevenue = soldProducts.reduce((sum, p) => sum + (p.salePrice || 0), 0)
    const totalProfit = soldProducts.reduce((sum, p) => sum + (p.profit || 0), 0)
    const totalCost = soldProducts.reduce((sum, p) => sum + (p.purchasePrice || 0), 0)
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    const listedProducts = products.filter(p => p.status === 'Listed')
    const listedValue = listedProducts.reduce((sum, p) => sum + (p.listingPrice || 0), 0)
    const unlistedProducts = products.filter(p => p.status === 'Unlisted')
    const unlistedValue = unlistedProducts.reduce((sum, p) => sum + (p.purchasePrice || 0), 0)

    const recentSold = soldProducts
      .sort((a, b) => new Date(b.saleDate || 0).getTime() - new Date(a.saleDate || 0).getTime())
      .slice(0, 5)

    const recentAdded = products
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)

    const marketplaceStats = (['eBay', 'Vinted', 'Etsy', 'Depop'] as Marketplace[]).map(mp => {
      const mpProducts = products.filter(p => p.marketplaces.includes(mp))
      const mpSold = mpProducts.filter(p => p.status === 'Sold')
      const mpRevenue = mpSold.reduce((sum, p) => sum + (p.salePrice || 0), 0)
      return { marketplace: mp, count: mpProducts.length, sold: mpSold.length, revenue: mpRevenue }
    }).filter(m => m.count > 0)

    const topProducts = soldProducts
      .sort((a, b) => (b.profit || 0) - (a.profit || 0))
      .slice(0, 5)

    return {
      totalProducts,
      unlisted,
      listed,
      awaitingShipping,
      sold,
      totalRevenue,
      totalProfit,
      totalCost,
      avgMargin,
      listedValue,
      unlistedValue,
      recentSold,
      recentAdded,
      marketplaceStats,
      topProducts,
    }
  }, [products])

  const periodStats = useMemo(() => {
    const range = periodRange(period)
    const sold = soldInPeriod(products, range)
    const periodExpenses = expensesInPeriod(expenses, range)
    const rev = revenue(sold)
    const prof = grossProfit(sold)
    const expTotal = expenseTotal(periodExpenses)
    const net = netProfit(sold, periodExpenses)
    const tax = taxEstimate(net)
    return {
      range,
      rev,
      prof,
      expTotal,
      net,
      tax,
      avgSale: averageSaleValue(sold),
      avgProfit: averageProfitPerItem(sold),
      margin: profitMargin(rev, prof),
      soldCount: sold.length,
    }
  }, [products, expenses, period])

  const stockIntel = useMemo(() => {
    return {
      capitalTiedUp: inventoryCapitalTiedUp(products),
      potentialRev: potentialRevenue(products),
      potentialProfit: potentialGrossProfit(products),
      ageing: stockAgeingBuckets(products),
      sellThrough: sellThroughRate(products),
    }
  }, [products])

  const alerts = useMemo(
    () => needsAttention(products, expenses),
    [products, expenses],
  )

  const insights = useMemo(() => {
    const result: { icon: string; message: string; action?: string; actionPath?: string }[] = []
    const unsold = products.filter((p) => p.status !== 'Sold')
    const allSold = products.filter((p) => p.status === 'Sold')
    const unlistedCount = products.filter((p) => p.status === 'Unlisted').length
    const awaitingCount = products.filter((p) => p.status === 'Awaiting Shipping').length
    const aged = unsold.filter((p) => {
      const age = (Date.now() - new Date(p.dateAdded || p.createdAt).getTime()) / (24 * 60 * 60 * 1000)
      return age >= 90
    })

    const mpData = groupByMarketplace(allSold)
    const topMp = mpData.length > 0 ? mpData.reduce((a, b) => (b.revenue > a.revenue ? b : a)) : null
    const totalRev = revenue(allSold)
    const mpDominance = topMp && totalRev > 0 ? (topMp.revenue / totalRev) * 100 : 0

    const brands = bestPerforming(allSold, 'brand')
    const topBrand = brands.length > 0 ? brands[0] : null
    const brandDominance = topBrand && totalRev > 0 ? (topBrand.revenue / totalRev) * 100 : 0

    if (unlistedCount > 0) {
      result.push({
        icon: '📦',
        message: `You have ${unlistedCount} unlisted product${unlistedCount > 1 ? 's' : ''}. List them to start generating revenue.`,
        action: 'View unlisted',
        actionPath: '/inventory',
      })
    }

    if (awaitingCount > 0) {
      result.push({
        icon: '🚚',
        message: `${awaitingCount} order${awaitingCount > 1 ? 's' : ''} awaiting shipment. Ship promptly to maintain good ratings.`,
        action: 'View orders',
        actionPath: '/inventory',
      })
    }

    if (aged.length > 0) {
      const agedValue = aged.reduce((sum, p) => sum + (p.listingPrice || p.purchasePrice), 0)
      result.push({
        icon: '⏰',
        message: `${aged.length} product${aged.length > 1 ? 's have' : ' has'} been in stock for 90+ days (${money(agedValue)} tied up). Consider discounting or relisting.`,
        action: 'View inventory',
        actionPath: '/inventory',
      })
    }

    if (periodStats.margin < 15 && periodStats.soldCount > 3) {
      result.push({
        icon: '📉',
        message: `Your profit margin is ${periodStats.margin.toFixed(1)}%, which is below 15%. Consider reviewing your pricing strategy.`,
        action: 'Pricing tool',
        actionPath: '/pricing',
      })
    }

    if (mpDominance > 70 && mpData.length > 1) {
      result.push({
        icon: '⚖️',
        message: `${topMp!.marketplace} accounts for ${mpDominance.toFixed(0)}% of your revenue. Diversifying across marketplaces reduces risk.`,
      })
    }

    if (brandDominance > 50 && brands.length > 2) {
      result.push({
        icon: '🏷️',
        message: `${topBrand!.name} makes up ${brandDominance.toFixed(0)}% of revenue. Expanding your brand range could improve resilience.`,
      })
    }

    if (periodStats.soldCount === 0 && products.length > 0) {
      result.push({
        icon: '🚀',
        message: 'No sales this period. List products at competitive prices to start generating revenue.',
        action: 'View inventory',
        actionPath: '/inventory',
      })
    }

    if (stockIntel.sellThrough < 20 && products.length > 10) {
      result.push({
        icon: '📊',
        message: `Sell-through rate is ${stockIntel.sellThrough.toFixed(0)}%. Focus on listing and pricing to improve turnover.`,
        action: 'Forecasts',
        actionPath: '/forecasts',
      })
    }

    if (periodStats.expTotal > periodStats.prof && periodStats.soldCount > 0) {
      result.push({
        icon: '💸',
        message: 'Expenses exceed gross profit this period. Review your expense categories for cost-saving opportunities.',
        action: 'Expenses',
        actionPath: '/expenses',
      })
    }

    return result.slice(0, 5)
  }, [products, periodStats, stockIntel, money])

  const formatCurrency = money

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Listed': return 'status-listed'
      case 'Sold': return 'status-sold'
      case 'Awaiting Shipping': return 'status-awaiting'
      default: return 'status-unlisted'
    }
  }

  if (loading) {
    return (
      <div className="inventory-page">
        <div className="page-heading">
          <div>
            <h1>Dashboard</h1>
            <p>Loading your business overview...</p>
          </div>
        </div>
        <LoadingState label="Loading dashboard data..." />
      </div>
    )
  }

  if (!currentBusiness) {
    return (
      <div className="inventory-page">
        <div className="page-heading">
          <div>
            <h1>Dashboard</h1>
            <p>No business selected</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--shq-ink-muted)' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>🏪</div>
          <p>Please create or select a business to view your dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="inventory-page">
      <div className="page-heading">
        <div>
          <h1>Dashboard</h1>
          <p>{currentBusiness.name} — Business overview and key metrics</p>
        </div>
        <div className="page-heading-actions">
          <button
            className="btn btn-primary"
            onClick={() => navigate('/inventory')}
          >
            + Add Product
          </button>
        </div>
      </div>

      <FilterBar
        searchValue={search}
        searchPlaceholder="Search products, brands, marketplaces..."
        onSearchChange={setSearch}
        filtersActive={search.trim().length > 0}
        onClearFilters={() => setSearch('')}
      />

      {search.trim().length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <SearchResults search={search} products={products} onSelect={(id) => navigate(`/products/${id}`)} />
        </div>
      )}

      <div className="inventory-stats">
        <div className="inventory-stat inventory-stat-unlisted">
          <span>Total Inventory</span>
          <strong>{stats.totalProducts}</strong>
          <span className="stat-label">
            {stats.unlisted} unlisted · {stats.listed} listed · {stats.awaitingShipping} awaiting
          </span>
        </div>

        <div className="inventory-stat inventory-stat-listed">
          <span>Listed Value</span>
          <strong>{formatCurrency(stats.listedValue)}</strong>
          <span className="stat-label">
            Across {stats.listed} active listings
          </span>
        </div>

        <div className="inventory-stat inventory-stat-sold">
          <span>Total Revenue</span>
          <strong>{formatCurrency(stats.totalRevenue)}</strong>
          <span className="stat-label">
            From {stats.sold} sold items
          </span>
        </div>

        <div className="inventory-stat">
          <span>Total Profit</span>
          <strong style={{ color: stats.totalProfit >= 0 ? 'var(--shq-success)' : 'var(--shq-loss)' }}>
            {formatCurrency(stats.totalProfit)}
          </strong>
          <span className="stat-label">
            Margin: {stats.avgMargin.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="dashboard-period-tabs">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab}
            className={`period-tab ${period === tab ? 'active' : ''}`}
            onClick={() => setPeriod(tab)}
          >
            {periodRange(tab).label}
          </button>
        ))}
      </div>

      <div className="inventory-stats">
        <div className="inventory-stat">
          <span>Gross Revenue ({periodStats.range.label})</span>
          <strong>{formatCurrency(periodStats.rev)}</strong>
          <span className="stat-label">{periodStats.soldCount} sold</span>
        </div>
        <div className="inventory-stat">
          <span>Net Profit</span>
          <strong style={{ color: periodStats.net >= 0 ? 'var(--shq-success)' : 'var(--shq-loss)' }}>
            {formatCurrency(periodStats.net)}
          </strong>
          <span className="stat-label">
            Profit {formatCurrency(periodStats.prof)} · Expenses {formatCurrency(periodStats.expTotal)}
          </span>
        </div>
        <div className="inventory-stat">
          <span>Est. Tax Liability</span>
          <strong>{formatCurrency(periodStats.tax.totalTax)}</strong>
          <span className="stat-label">
            Taxable profit {formatCurrency(periodStats.tax.taxableProfit)}
          </span>
        </div>
        <div className="inventory-stat">
          <span>Avg Sale / Margin</span>
          <strong>{formatCurrency(periodStats.avgSale)}</strong>
          <span className="stat-label">
            Avg profit {formatCurrency(periodStats.avgProfit)} · {periodStats.margin.toFixed(1)}%
          </span>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="dashboard-alerts">
          <h3>Needs attention</h3>
          <div className="dashboard-alerts-list">
            {alerts.map((a) => (
              <div key={a.id} className={`dashboard-alert alert-${a.level}`}>
                <span className="alert-dot" aria-hidden="true"></span>
                <span>{a.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights.length > 0 && (
        <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Smart insights</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {insights.map((insight, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'var(--shq-bg)',
                  borderRadius: 10,
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{insight.icon}</span>
                  <span style={{ fontSize: 13, lineHeight: 1.5 }}>{insight.message}</span>
                </div>
                {insight.action && insight.actionPath && (
                  <button
                    type="button"
                    className="row-action-link"
                    style={{ fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}
                    onClick={() => navigate(insight.actionPath!)}
                  >
                    {insight.action}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600' }}>Stock Intelligence</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--shq-border)' }}>
              <span>Capital tied up</span>
              <strong>{formatCurrency(stockIntel.capitalTiedUp)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--shq-border)' }}>
              <span>Potential revenue</span>
              <strong>{formatCurrency(stockIntel.potentialRev)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--shq-border)' }}>
              <span>Potential gross profit</span>
              <strong style={{ color: 'var(--shq-success)' }}>{formatCurrency(stockIntel.potentialProfit)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span>Sell-through rate</span>
              <strong>{stockIntel.sellThrough.toFixed(1)}%</strong>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600' }}>Stock Ageing</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stockIntel.ageing.map((b) => (
              <div key={b.bucket} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--shq-border)' }}>
                <span>{b.bucket}</span>
                <div style={{ textAlign: 'right' }}>
                  <strong>{b.count}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--shq-ink-muted)' }}>{formatCurrency(b.value)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600', color: 'var(--shq-ink)' }}>
            Status Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--shq-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={`status-badge ${getStatusClass('Unlisted')}`} style={{ width: '10px', height: '10px', borderRadius: '50%' }}></span>
                <span>Unlisted</span>
              </div>
              <strong>{stats.unlisted}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--shq-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={`status-badge ${getStatusClass('Listed')}`} style={{ width: '10px', height: '10px', borderRadius: '50%' }}></span>
                <span>Listed</span>
              </div>
              <strong>{stats.listed}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--shq-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={`status-badge ${getStatusClass('Awaiting Shipping')}`} style={{ width: '10px', height: '10px', borderRadius: '50%' }}></span>
                <span>Awaiting Shipping</span>
              </div>
              <strong>{stats.awaitingShipping}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={`status-badge ${getStatusClass('Sold')}`} style={{ width: '10px', height: '10px', borderRadius: '50%' }}></span>
                <span>Sold</span>
              </div>
              <strong>{stats.sold}</strong>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600', color: 'var(--shq-ink)' }}>
            Marketplace Performance
          </h3>
          {stats.marketplaceStats.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.marketplaceStats.map(mp => (
                <div key={mp.marketplace} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--shq-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>
                      {mp.marketplace === 'eBay' && '🛒'}
                      {mp.marketplace === 'Vinted' && '💜'}
                      {mp.marketplace === 'Etsy' && '🧵'}
                      {mp.marketplace === 'Depop' && '👕'}
                    </span>
                    <span>{mp.marketplace}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--shq-ink)' }}>
                      {formatCurrency(mp.revenue)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--shq-ink-muted)' }}>
                      {mp.sold} sold · {mp.count} total
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--shq-ink-muted)', textAlign: 'center', padding: '20px' }}>No marketplace data yet</p>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--shq-ink)' }}>
              Recent Sales
            </h3>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => navigate('/sales')}
            >
              View All
            </button>
          </div>
          {stats.recentSold.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.recentSold.map(product => (
                <div key={product.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--shq-surface-subtle)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {product.photos && product.photos.length > 0 ? (
                      <img src={product.photos[0]} alt={product.name} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--shq-surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                        📦
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: '500', color: 'var(--shq-ink)' }}>{product.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--shq-ink-muted)' }}>
                        {product.saleMarketplace ? `${product.saleMarketplace} · ` : ''}
                        {formatDate(product.saleDate)}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', color: 'var(--shq-success)' }}>
                      +{formatCurrency(product.salePrice || 0)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--shq-ink-muted)' }}>
                      Profit: {formatCurrency(product.profit || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--shq-ink-muted)', textAlign: 'center', padding: '20px' }}>No sales yet</p>
          )}
        </div>

        <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--shq-ink)' }}>
              Recently Added
            </h3>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => navigate('/inventory')}
            >
              View All
            </button>
          </div>
          {stats.recentAdded.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.recentAdded.map(product => (
                <div key={product.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--shq-surface-subtle)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {product.photos && product.photos.length > 0 ? (
                      <img src={product.photos[0]} alt={product.name} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--shq-surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                        📦
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: '500', color: 'var(--shq-ink)' }}>{product.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--shq-ink-muted)' }}>
                        {formatCurrency(product.purchasePrice)} · {formatDate(product.createdAt)}
                      </div>
                    </div>
                  </div>
                  <span className={`status-badge ${getStatusClass(product.status)}`}>
                    {product.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--shq-ink-muted)', textAlign: 'center', padding: '20px' }}>No products yet</p>
          )}
        </div>
      </div>

      <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--shq-ink)' }}>
            Top Performing Products
          </h3>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={() => navigate('/inventory')}
          >
            View Inventory
          </button>
        </div>
        {stats.topProducts.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Marketplace</th>
                  <th>Sale Price</th>
                  <th>Cost</th>
                  <th>Profit</th>
                  <th>Margin</th>
                  <th>Sold Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.topProducts.map(product => (
                  <tr key={product.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {product.photos && product.photos.length > 0 ? (
                          <img src={product.photos[0]} alt={product.name} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'var(--shq-surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                            📦
                          </div>
                        )}
                        <span style={{ fontWeight: '500' }}>{product.name}</span>
                      </div>
                    </td>
                    <td>{product.saleMarketplace || '—'}</td>
                    <td>{formatCurrency(product.salePrice || 0)}</td>
                    <td>{formatCurrency(product.purchasePrice + product.fees + product.additionalCosts)}</td>
                    <td style={{ color: 'var(--shq-success)', fontWeight: '600' }}>{formatCurrency(product.profit || 0)}</td>
                    <td>{product.salePrice ? ((product.profit || 0) / product.salePrice * 100).toFixed(1) + '%' : '—'}</td>
                    <td>{formatDate(product.saleDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--shq-ink-muted)', textAlign: 'center', padding: '20px' }}>No sold products yet</p>
        )}
      </div>

      <div style={{ marginTop: '24px', padding: '24px', background: 'var(--shq-surface-subtle)', borderRadius: '12px', border: '1px solid var(--shq-border)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: 'var(--shq-ink)' }}>
          Quick Actions
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/inventory')}>
            + Add Product
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/inventory')}>
            View Inventory
          </button>
          {settings.features.listingsEnabled && (
            <button className="btn btn-secondary" onClick={() => navigate('/listings')}>
              Manage Listings
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => navigate('/sales')}>
            Record Sale
          </button>
          {settings.features.expensesEnabled && (
            <button className="btn btn-secondary" onClick={() => navigate('/expenses')}>
              Add Expense
            </button>
          )}
          {settings.features.forecastsEnabled && (
            <button className="btn btn-secondary" onClick={() => navigate('/forecasts')}>
              View Forecasts
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => navigate('/settings')}>
            Settings
          </button>
        </div>
      </div>
    </div>
  )
}

function SearchResults({
  search,
  products,
  onSelect,
}: {
  search: string
  products: import('../types/product').Product[]
  onSelect: (id: string) => void
}) {
  const query = search.trim().toLowerCase()
  const matches = useMemo(() => {
    return products
      .filter((p) =>
        [
          p.name,
          p.brand,
          p.code,
          p.sku,
          p.category,
          ...p.marketplaces,
          p.saleMarketplace,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 8)
  }, [products, query])

  if (matches.length === 0) {
    return (
      <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '16px', color: 'var(--shq-ink-muted)', fontSize: '13px' }}>
        No products match "{search.trim()}".
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', overflow: 'hidden' }}>
      {matches.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 16px',
            border: 'none',
            borderBottom: '1px solid var(--shq-border)',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--shq-ink)',
            textAlign: 'left',
            fontSize: '13px',
          }}
        >
          <span style={{ fontWeight: '500' }}>{p.name}</span>
          <span style={{ color: 'var(--shq-ink-faint)', fontSize: '12px', flexShrink: 0 }}>
            {p.brand || p.category || p.code} · {p.status}
          </span>
        </button>
      ))}
    </div>
  )
}

export default Dashboard