import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import Icon from '../components/Icon'
import WorkspaceShell, { type WorkspaceTab } from '../components/WorkspaceShell'
import { useCurrency } from '../hooks/useCurrency'
import { useExpenses } from '../hooks/useExpenses'
import { useProducts } from '../hooks/useProducts'
import {
  bestPerforming,
  expenseTotal,
  grossProfit,
  groupByMarketplace,
  groupByMonth,
  inventoryCapitalTiedUp,
  netProfit,
  profitMargin,
  revenue,
  sellThroughRate,
  stockAgeingBuckets,
  taxEstimate,
} from '../lib/finance'
import Forecasts from './Forecasts'

type AnalyticsView = 'performance' | 'marketplaces' | 'inventory' | 'forecast' | 'scenarios'

function AnalyticsWorkspace() {
  const [params, setParams] = useSearchParams()
  const { products } = useProducts()
  const { expenses } = useExpenses()

  const requested = params.get('view') as AnalyticsView | null
  const view: AnalyticsView = ['performance', 'marketplaces', 'inventory', 'forecast', 'scenarios'].includes(requested ?? '')
    ? (requested as AnalyticsView)
    : 'performance'

  const sold = useMemo(() => products.filter((product) => product.status === 'Sold'), [products])
  const rev = revenue(sold)
  const gross = grossProfit(sold)
  const exp = expenseTotal(expenses)
  const net = netProfit(sold, expenses)
  const margin = profitMargin(rev, gross)

  const tabs: WorkspaceTab[] = [
    { id: 'performance', label: 'Performance', icon: 'reports' },
    { id: 'marketplaces', label: 'Marketplaces', icon: 'listings' },
    { id: 'inventory', label: 'Inventory', icon: 'inventory' },
    { id: 'forecast', label: 'Forecast', icon: 'forecast' },
    { id: 'scenarios', label: 'Scenarios', icon: 'sparkles' },
  ]

  return (
    <WorkspaceShell
      title="Analytics"
      description="Understand performance, channel mix, stock efficiency and what could happen next."
      eyebrow="Insights"
      tabs={tabs}
      activeTab={view}
      onTabChange={(next) => setParams(next === 'performance' ? {} : { view: next })}
    >
      {view === 'performance' && (
        <PerformanceView
          sold={sold}
          rev={rev}
          gross={gross}
          exp={exp}
          net={net}
          margin={margin}
        />
      )}
      {view === 'marketplaces' && <MarketplaceView sold={sold} />}
      {view === 'inventory' && <InventoryAnalyticsView />}
      {view === 'forecast' && (
        <div className="workspace-v2-embedded workspace-v2-embedded-analytics">
          <Forecasts />
        </div>
      )}
      {view === 'scenarios' && <ScenarioView sold={sold} expensesTotal={exp} />}
    </WorkspaceShell>
  )
}

function PerformanceView({
  sold,
  rev,
  gross,
  exp,
  net,
  margin,
}: {
  sold: ReturnType<typeof useProducts>['products']
  rev: number
  gross: number
  exp: number
  net: number
  margin: number
}) {
  const { money } = useCurrency()
  const monthly = useMemo(() => groupByMonth(sold).slice(-12), [sold])
  const bestBrands = useMemo(() => bestPerforming(sold, 'brand').slice(0, 5), [sold])
  const bestCategories = useMemo(() => bestPerforming(sold, 'category').slice(0, 5), [sold])
  const maxRevenue = Math.max(1, ...monthly.map((item) => item.revenue))
  const averageSale = sold.length ? rev / sold.length : 0

  return (
    <div className="analytics-view-v2">
      <div className="workspace-metric-strip workspace-metric-strip-4">
        <div><span>Revenue</span><strong>{money(rev)}</strong></div>
        <div><span>Gross profit</span><strong>{money(gross)}</strong></div>
        <div><span>Net profit</span><strong>{money(net)}</strong></div>
        <div><span>Gross margin</span><strong>{margin.toFixed(1)}%</strong></div>
      </div>

      <div className="analytics-main-grid-v2">
        <section className="panel-v2 analytics-chart-panel-v2">
          <header className="panel-v2-header"><div><h2>Revenue & profit trend</h2><p>Last twelve recorded sales months</p></div></header>
          {monthly.length ? (
            <div className="analytics-bars-v2">
              {monthly.map((item) => (
                <div className="analytics-bar-column-v2" key={item.month} title={`${item.month}: ${money(item.revenue)} revenue, ${money(item.profit)} profit`}>
                  <div className="analytics-bar-area-v2">
                    <span className="analytics-bar-revenue-v2" style={{ height: `${Math.max(3, (item.revenue / maxRevenue) * 100)}%` }} />
                    <span className="analytics-bar-profit-v2" style={{ height: `${Math.max(3, (Math.max(0, item.profit) / maxRevenue) * 100)}%` }} />
                  </div>
                  <span>{item.month}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="action-empty-v2"><strong>No sales trend yet</strong><span>Record sales to build performance history.</span></div>
          )}
          <div className="analytics-legend-v2"><span><i className="revenue" />Revenue</span><span><i className="profit" />Gross profit</span></div>
        </section>

        <section className="panel-v2">
          <header className="panel-v2-header"><div><h2>Operating summary</h2><p>How revenue becomes net profit</p></div></header>
          <div className="finance-ledger-v2">
            <FinanceLine label="Revenue" value={money(rev)} />
            <FinanceLine label="Sale costs & fees" value={`−${money(Math.max(0, rev - gross))}`} />
            <FinanceLine label="Gross profit" value={money(gross)} strong />
            <FinanceLine label="Operating expenses" value={`−${money(exp)}`} />
            <FinanceLine label="Net profit" value={money(net)} strong accent />
          </div>
          <div className="analytics-mini-stats-v2">
            <div><span>Sales</span><strong>{sold.length}</strong></div>
            <div><span>Average sale</span><strong>{money(averageSale)}</strong></div>
          </div>
        </section>
      </div>

      <div className="analytics-lower-grid-v2">
        <RankingPanel title="Best brands" rows={bestBrands} />
        <RankingPanel title="Best categories" rows={bestCategories} />
      </div>
    </div>
  )
}

function MarketplaceView({ sold }: { sold: ReturnType<typeof useProducts>['products'] }) {
  const { money } = useCurrency()
  const data = useMemo(() => groupByMarketplace(sold).sort((a, b) => b.revenue - a.revenue), [sold])
  const total = data.reduce((sum, row) => sum + row.revenue, 0)
  const max = Math.max(1, ...data.map((row) => row.revenue))

  return (
    <div className="analytics-view-v2">
      <div className="workspace-metric-strip">
        <div><span>Channels</span><strong>{data.length}</strong></div>
        <div><span>Channel revenue</span><strong>{money(total)}</strong></div>
        <div><span>Top channel</span><strong>{data[0]?.marketplace ?? '—'}</strong></div>
      </div>
      <section className="panel-v2">
        <header className="panel-v2-header"><div><h2>Marketplace performance</h2><p>Compare revenue, profit and sales volume by channel</p></div></header>
        {data.length ? (
          <div className="marketplace-analytics-v2">
            {data.map((row) => (
              <div className="marketplace-analytics-row-v2" key={row.marketplace}>
                <div className="marketplace-analytics-name-v2"><strong>{row.marketplace}</strong><span>{row.count} sale{row.count === 1 ? '' : 's'}</span></div>
                <div className="marketplace-analytics-bar-wrap-v2"><span style={{ width: `${(row.revenue / max) * 100}%` }} /></div>
                <div className="marketplace-analytics-values-v2"><strong>{money(row.revenue)}</strong><span>{money(row.profit)} profit</span></div>
              </div>
            ))}
          </div>
        ) : <div className="action-empty-v2"><strong>No marketplace data yet</strong><span>Channel performance appears once sales are recorded with a marketplace.</span></div>}
      </section>
    </div>
  )
}

function InventoryAnalyticsView() {
  const { products } = useProducts()
  const { money } = useCurrency()
  const ageing = useMemo(() => stockAgeingBuckets(products), [products])
  const sellThrough = sellThroughRate(products)
  const capital = inventoryCapitalTiedUp(products)
  const active = products.filter((product) => product.status !== 'Sold')
  const listed = active.filter((product) => product.status === 'Listed').length
  const unlisted = active.filter((product) => product.status === 'Unlisted').length
  const maxCount = Math.max(1, ...ageing.map((bucket) => bucket.count))

  return (
    <div className="analytics-view-v2">
      <div className="workspace-metric-strip workspace-metric-strip-4">
        <div><span>Capital tied up</span><strong>{money(capital)}</strong></div>
        <div><span>Sell-through</span><strong>{sellThrough.toFixed(1)}%</strong></div>
        <div><span>Listed</span><strong>{listed}</strong></div>
        <div><span>Unlisted</span><strong>{unlisted}</strong></div>
      </div>
      <div className="analytics-main-grid-v2">
        <section className="panel-v2">
          <header className="panel-v2-header"><div><h2>Stock ageing</h2><p>How long capital has remained in inventory</p></div></header>
          <div className="ageing-list-v2">
            {ageing.map((bucket) => (
              <div key={bucket.bucket}>
                <div className="ageing-row-head-v2"><span>{bucket.bucket}</span><strong>{bucket.count} · {money(bucket.value)}</strong></div>
                <div className="ageing-track-v2"><span style={{ width: `${(bucket.count / maxCount) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel-v2">
          <header className="panel-v2-header"><div><h2>Inventory efficiency</h2><p>Availability and conversion of purchased stock</p></div></header>
          <div className="inventory-efficiency-v2">
            <div className="efficiency-score-v2"><strong>{sellThrough.toFixed(0)}%</strong><span>sell-through rate</span></div>
            <div className="health-v2-track"><span style={{ width: `${Math.min(100, sellThrough)}%` }} /></div>
            <div className="analytics-mini-stats-v2">
              <div><span>Active stock</span><strong>{active.length}</strong></div>
              <div><span>Listing rate</span><strong>{active.length ? ((listed / active.length) * 100).toFixed(0) : '0'}%</strong></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function ScenarioView({
  sold,
  expensesTotal,
}: {
  sold: ReturnType<typeof useProducts>['products']
  expensesTotal: number
}) {
  const { money } = useCurrency()
  const [volumeChange, setVolumeChange] = useState(10)
  const [priceChange, setPriceChange] = useState(0)
  const [expenseChange, setExpenseChange] = useState(0)

  const baseRevenue = revenue(sold)
  const baseGross = grossProfit(sold)
  const units = sold.length
  const averagePrice = units ? baseRevenue / units : 0
  const grossMargin = baseRevenue > 0 ? baseGross / baseRevenue : 0
  const projectedUnits = Math.max(0, Math.round(units * (1 + volumeChange / 100)))
  const projectedAverage = Math.max(0, averagePrice + priceChange)
  const projectedRevenue = projectedUnits * projectedAverage
  const projectedGross = projectedRevenue * grossMargin
  const projectedExpenses = Math.max(0, expensesTotal * (1 + expenseChange / 100))
  const projectedNet = projectedGross - projectedExpenses
  const projectedTax = taxEstimate(projectedNet).totalTax

  return (
    <div className="scenario-v2">
      <section className="panel-v2 scenario-controls-v2">
        <header className="panel-v2-header"><div><h2>What if…</h2><p>Model changes without modifying your real SellerHQ data.</p></div><Icon name="sparkles" size={17} /></header>
        <ScenarioControl label="Sales volume" value={volumeChange} suffix="%" min={-100} max={200} step={5} onChange={setVolumeChange} />
        <ScenarioControl label="Average selling price" value={priceChange} prefix="£" min={-100} max={100} step={1} onChange={setPriceChange} />
        <ScenarioControl label="Operating expenses" value={expenseChange} suffix="%" min={-100} max={200} step={5} onChange={setExpenseChange} />
      </section>

      <section className="panel-v2 scenario-results-v2">
        <header className="panel-v2-header"><div><h2>Projected outcome</h2><p>Based on current all-time recorded performance</p></div></header>
        <div className="scenario-result-grid-v2">
          <div><span>Projected units</span><strong>{projectedUnits}</strong><small>{units} baseline</small></div>
          <div><span>Average price</span><strong>{money(projectedAverage)}</strong><small>{money(averagePrice)} baseline</small></div>
          <div><span>Revenue</span><strong>{money(projectedRevenue)}</strong><small>{money(projectedRevenue - baseRevenue)} change</small></div>
          <div><span>Net profit</span><strong>{money(projectedNet)}</strong><small>after modelled expenses</small></div>
          <div><span>Tax estimate</span><strong>{money(projectedTax)}</strong><small>planning estimate</small></div>
        </div>
      </section>
    </div>
  )
}

function ScenarioControl({ label, value, prefix, suffix, min, max, step, onChange }: { label: string; value: number; prefix?: string; suffix?: string; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <label className="scenario-control-v2">
      <div><span>{label}</span><strong>{prefix}{value > 0 && !prefix ? '+' : ''}{value}{suffix}</strong></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}

function RankingPanel({ title, rows }: { title: string; rows: ReturnType<typeof bestPerforming> }) {
  const { money } = useCurrency()
  return (
    <section className="panel-v2">
      <header className="panel-v2-header"><div><h3>{title}</h3><p>Ranked by recorded gross profit</p></div></header>
      {rows.length ? <div className="compact-list-v2">{rows.map((row, index) => <div className="compact-row-v2" key={row.name}><div className="compact-row-v2-main"><span className="compact-row-v2-title">{index + 1}. {row.name || 'Uncategorised'}</span><span className="compact-row-v2-subtitle">{row.count} sold · {money(row.revenue)} revenue</span></div><span className="compact-row-v2-value">{money(row.profit)}</span></div>)}</div> : <div className="action-empty-v2"><strong>No ranking yet</strong><span>More sales data is needed.</span></div>}
    </section>
  )
}

function FinanceLine({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return <div className={`finance-row-v2 ${strong ? 'strong' : ''} ${accent ? 'accent' : ''}`}><span>{label}</span><strong>{value}</strong></div>
}

export default AnalyticsWorkspace
