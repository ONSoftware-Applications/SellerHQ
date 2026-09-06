import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Icon from '../components/Icon'
import LoadingState from '../components/LoadingState'
import { useBusiness } from '../hooks/useBusiness'
import { useCurrency } from '../hooks/useCurrency'
import { useExpenses } from '../hooks/useExpenses'
import { useProducts } from '../hooks/useProducts'
import { useSubscription } from '../hooks/useSubscription'
import {
  type Period,
  expenseTotal,
  expensesInPeriod,
  grossProfit,
  groupByMarketplace,
  inventoryCapitalTiedUp,
  netProfit,
  periodRange,
  productSaleDate,
  profitMargin,
  revenue,
  sellThroughRate,
  soldInPeriod,
  stockAgeingBuckets,
} from '../lib/finance'

const PERIODS: Period[] = ['week', 'month', 'year', 'all']

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function DashboardV2() {
  const navigate = useNavigate()
  const { products, loading } = useProducts()
  const { currentBusiness } = useBusiness()
  const { expenses } = useExpenses()
  const { canUse } = useSubscription()
  const { money } = useCurrency()
  const [period, setPeriod] = useState<Period>('month')

  const stats = useMemo(() => {
    const range = periodRange(period)
    const sold = soldInPeriod(products, range)
    const periodExpenses = expensesInPeriod(expenses, range)
    const rev = revenue(sold)
    const gross = grossProfit(sold)
    const expense = expenseTotal(periodExpenses)
    const net = netProfit(sold, periodExpenses)
    const active = products.filter((product) => product.status !== 'Sold')
    const listed = active.filter((product) => product.status === 'Listed')
    const unlisted = active.filter((product) => product.status === 'Unlisted')
    const awaiting = active.filter((product) => product.status === 'Awaiting Shipping')
    const ageing = stockAgeingBuckets(products)
    const aged = ageing.find((bucket) => bucket.bucket === '90+ days')

    return {
      range,
      rev,
      gross,
      expense,
      net,
      soldCount: sold.length,
      averageSale: sold.length ? rev / sold.length : 0,
      margin: profitMargin(rev, gross),
      active,
      listed,
      unlisted,
      awaiting,
      aged,
      capital: inventoryCapitalTiedUp(products),
      listingRate: active.length ? (listed.length / active.length) * 100 : 0,
      sellThrough: sellThroughRate(products),
    }
  }, [expenses, period, products])

  const trend = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, index) => {
      const point = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)
      const sold = products.filter((product) => {
        if (product.status !== 'Sold' || product.salePrice === null) return false
        const raw = productSaleDate(product)
        if (!raw) return false
        const date = new Date(raw)
        return date.getFullYear() === point.getFullYear() && date.getMonth() === point.getMonth()
      })
      return {
        key: point.toISOString(),
        label: point.toLocaleString('en-GB', { month: 'short' }),
        revenue: revenue(sold),
        profit: grossProfit(sold),
      }
    })
  }, [products])

  const trendMax = Math.max(1, ...trend.map((point) => point.revenue))
  const sixMonthRevenue = trend.reduce((sum, point) => sum + point.revenue, 0)
  const sixMonthProfit = trend.reduce((sum, point) => sum + point.profit, 0)

  const marketplaces = useMemo(
    () => groupByMarketplace(products.filter((product) => product.status === 'Sold'))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4),
    [products],
  )
  const marketplaceMax = Math.max(1, ...marketplaces.map((item) => item.revenue))

  const recent = useMemo(
    () => [...products]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 4),
    [products],
  )

  const actions = useMemo(() => {
    const items: { id: string; title: string; copy: string; icon: 'truck' | 'package' | 'clock' | 'trend-down' | 'wallet'; path: string }[] = []
    if (stats.awaiting.length) items.push({ id: 'ship', title: `${stats.awaiting.length} order${stats.awaiting.length === 1 ? '' : 's'} awaiting shipment`, copy: 'Move sold stock through dispatch so orders do not stall.', icon: 'truck', path: '/orders?view=awaiting' })
    if (stats.unlisted.length) items.push({ id: 'list', title: `${stats.unlisted.length} product${stats.unlisted.length === 1 ? '' : 's'} not listed`, copy: 'These products are holding capital but are not currently available to buyers.', icon: 'package', path: '/inventory?view=unlisted' })
    if ((stats.aged?.count ?? 0) > 0) items.push({ id: 'age', title: `${stats.aged?.count ?? 0} product${stats.aged?.count === 1 ? '' : 's'} held for 90+ days`, copy: `${money(stats.aged?.value ?? 0)} of purchase capital is tied up in ageing stock.`, icon: 'clock', path: canUse('reports') ? '/analytics?view=inventory' : '/inventory' })
    if (stats.soldCount > 3 && stats.margin < 15) items.push({ id: 'margin', title: `Margin is ${stats.margin.toFixed(1)}%`, copy: 'Pricing or sourcing costs may need attention.', icon: 'trend-down', path: '/inventory?view=pricing' })
    if (stats.soldCount > 0 && stats.expense > stats.gross) items.push({ id: 'expense', title: 'Expenses exceed gross profit', copy: `${money(stats.expense)} of expenses have overtaken gross profit this period.`, icon: 'wallet', path: '/finance?view=expenses' })
    return items.slice(0, 4)
  }, [canUse, money, stats])

  if (loading) return <LoadingState label="Loading business overview..." />

  if (!currentBusiness) {
    return <div className="panel-v2 action-empty-v2"><strong>No business selected</strong><span>Create or select a business to view your SellerHQ overview.</span></div>
  }

  return (
    <div className="dashboard-v2">
      <header className="dashboard-v2-hero">
        <div>
          <span className="dashboard-v2-kicker"><Icon name="building" size={14} />{currentBusiness.name} · {stats.range.label}</span>
          <h1>{greeting()}.</h1>
          <p>Here is what is happening across your business.</p>
        </div>
        <button className="dashboard-v2-primary-action" type="button" onClick={() => navigate('/inventory')}><Icon name="plus" size={16} />Add product</button>
      </header>

      <div className="dashboard-v2-periods" aria-label="Dashboard period">
        {PERIODS.map((item) => <button type="button" key={item} className={period === item ? 'active' : ''} onClick={() => setPeriod(item)}>{item === 'week' ? '7 days' : item === 'month' ? 'Month' : item === 'year' ? 'Year' : 'All time'}</button>)}
      </div>

      <section className="dashboard-v2-metrics">
        <article className="metric-v2"><div className="metric-v2-head"><span className="metric-v2-label">Revenue</span><span className="metric-v2-icon"><Icon name="sales" size={15} /></span></div><strong className="metric-v2-value">{money(stats.rev)}</strong><span className="metric-v2-meta">{stats.soldCount} sale{stats.soldCount === 1 ? '' : 's'} in period</span></article>
        <article className="metric-v2"><div className="metric-v2-head"><span className="metric-v2-label">Net profit</span><span className="metric-v2-icon"><Icon name="trend-up" size={15} /></span></div><strong className="metric-v2-value">{money(stats.net)}</strong><span className={`metric-v2-meta ${stats.net >= 0 ? 'positive' : 'negative'}`}><Icon name={stats.net >= 0 ? 'trend-up' : 'trend-down'} size={12} />{stats.margin.toFixed(1)}% gross margin</span></article>
        <article className="metric-v2"><div className="metric-v2-head"><span className="metric-v2-label">Average sale</span><span className="metric-v2-icon"><Icon name="wallet" size={15} /></span></div><strong className="metric-v2-value">{money(stats.averageSale)}</strong><span className="metric-v2-meta">{money(stats.expense)} business expenses</span></article>
        <article className="metric-v2"><div className="metric-v2-head"><span className="metric-v2-label">Inventory capital</span><span className="metric-v2-icon"><Icon name="inventory" size={15} /></span></div><strong className="metric-v2-value">{money(stats.capital)}</strong><span className="metric-v2-meta">{stats.active.length} active product{stats.active.length === 1 ? '' : 's'}</span></article>
      </section>

      <section className="dashboard-v2-grid">
        <article className="panel-v2">
          <header className="panel-v2-header"><div><h2>Revenue & profit</h2><p>Performance across the last six months</p></div>{canUse('reports') && <button className="panel-v2-link" type="button" onClick={() => navigate('/analytics')}>View analytics <Icon name="arrow-right" size={12} /></button>}</header>
          <div className="dashboard-trend">
            <div className="dashboard-trend-summary"><div><span>6 month revenue</span><strong>{money(sixMonthRevenue)}</strong></div><div><span>6 month gross profit</span><strong>{money(sixMonthProfit)}</strong></div></div>
            <div className="dashboard-bars">{trend.map((point) => <div className="dashboard-bar-group" key={point.key} title={`${point.label}: ${money(point.revenue)} revenue`}><span className="dashboard-bar revenue" style={{ height: `${Math.max(2, point.revenue / trendMax * 100)}%` }} /><span className="dashboard-bar profit" style={{ height: `${Math.max(2, Math.max(0, point.profit) / trendMax * 100)}%` }} /></div>)}</div>
            <div className="dashboard-bar-labels">{trend.map((point) => <span key={point.key}>{point.label}</span>)}</div>
          </div>
        </article>

        <aside className="panel-v2 action-centre-v2">
          <header className="panel-v2-header"><div><h2>Action Centre</h2><p>{actions.length ? `${actions.length} item${actions.length === 1 ? '' : 's'} need attention` : 'No urgent actions'}</p></div><Icon name="sparkles" size={16} /></header>
          {actions.length ? actions.map((item) => <div className="action-item-v2 high" key={item.id}><span className="action-item-v2-icon"><Icon name={item.icon} size={15} /></span><div className="action-item-v2-body"><div className="action-item-v2-title">{item.title}</div><div className="action-item-v2-copy">{item.copy}</div><button type="button" className="panel-v2-link" onClick={() => navigate(item.path)}>Review <Icon name="arrow-right" size={11} /></button></div></div>) : <div className="action-empty-v2"><div className="action-empty-v2-icon"><Icon name="check" size={17} /></div><strong>You are caught up</strong><span>SellerHQ has not found anything requiring immediate attention.</span></div>}
        </aside>
      </section>

      <section className="dashboard-v2-lower-grid">
        <article className="panel-v2"><header className="panel-v2-header"><div><h3>Inventory health</h3><p>Availability and stock efficiency</p></div><button className="panel-v2-link" type="button" onClick={() => navigate('/inventory')}>Inventory <Icon name="arrow-right" size={11} /></button></header><div className="health-v2"><div className="health-v2-score"><div><strong>{stats.listingRate.toFixed(0)}%</strong><span> of active stock listed</span></div><span>{stats.sellThrough.toFixed(0)}% sell-through</span></div><div className="health-v2-track"><span style={{ width: `${Math.min(100, stats.listingRate)}%` }} /></div><div className="health-v2-stats"><div className="health-v2-stat"><span>Listed</span><strong>{stats.listed.length}</strong></div><div className="health-v2-stat"><span>Unlisted</span><strong>{stats.unlisted.length}</strong></div><div className="health-v2-stat"><span>Awaiting shipment</span><strong>{stats.awaiting.length}</strong></div><div className="health-v2-stat"><span>90+ day stock</span><strong>{stats.aged?.count ?? 0}</strong></div></div></div></article>

        <article className="panel-v2"><header className="panel-v2-header"><div><h3>Marketplace performance</h3><p>Revenue by sales channel</p></div></header>{marketplaces.length ? <div className="compact-list-v2">{marketplaces.map((item) => <div className="compact-row-v2" key={item.marketplace}><div className="compact-row-v2-main"><span className="compact-row-v2-title">{item.marketplace}</span><span className="compact-row-v2-subtitle">{item.count} sale{item.count === 1 ? '' : 's'} · {money(item.profit)} profit</span></div><div><span className="compact-row-v2-value">{money(item.revenue)}</span><div className="marketplace-bar-v2"><span style={{ width: `${item.revenue / marketplaceMax * 100}%` }} /></div></div></div>)}</div> : <div className="action-empty-v2"><strong>No marketplace sales yet</strong><span>Channel performance will appear here as sales are recorded.</span></div>}</article>

        <article className="panel-v2"><header className="panel-v2-header"><div><h3>Recent activity</h3><p>Latest product movement</p></div></header>{recent.length ? <div className="compact-list-v2">{recent.map((product) => <button type="button" className="compact-row-v2 compact-row-v2-button" key={product.id} onClick={() => navigate(`/products/${product.id}`)}><div className="compact-row-v2-main"><span className="compact-row-v2-title">{product.name}</span><span className="compact-row-v2-subtitle">{product.status}</span></div><span className="compact-row-v2-value">{product.salePrice !== null ? money(product.salePrice) : product.listingPrice !== null ? money(product.listingPrice) : '—'}</span></button>)}</div> : <div className="action-empty-v2"><strong>No activity yet</strong><span>Add your first product to start building your business timeline.</span></div>}</article>
      </section>
    </div>
  )
}

export default DashboardV2