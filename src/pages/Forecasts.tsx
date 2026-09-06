import { useMemo, useState } from 'react'

import Icon from '../components/Icon'
import { useCurrency } from '../hooks/useCurrency'
import { useExpenses } from '../hooks/useExpenses'
import { useProducts } from '../hooks/useProducts'
import { useSubscription } from '../hooks/useSubscription'
import { productSaleDate, taxEstimate } from '../lib/finance'

type ForecastPoint = {
  key: string
  label: string
  revenue: number
  grossProfit: number
  units: number
  forecast: boolean
}

function Forecasts() {
  const { products } = useProducts()
  const { expenses } = useExpenses()
  const { money } = useCurrency()
  const { canUse } = useSubscription()
  const [historyMonths, setHistoryMonths] = useState<6 | 12>(12)
  const [forecastMonths, setForecastMonths] = useState<3 | 6>(3)

  const history = useMemo(() => {
    const now = new Date()
    return Array.from({ length: historyMonths }, (_, index) => {
      const point = new Date(now.getFullYear(), now.getMonth() - historyMonths + 1 + index, 1)
      const sold = products.filter((product) => {
        if (product.status !== 'Sold' || product.salePrice === null) return false
        const raw = productSaleDate(product)
        if (!raw) return false
        const date = new Date(raw)
        return date.getFullYear() === point.getFullYear() && date.getMonth() === point.getMonth()
      })

      return {
        key: `${point.getFullYear()}-${point.getMonth()}`,
        label: point.toLocaleString('en-GB', { month: 'short' }),
        revenue: sold.reduce((sum, product) => sum + (product.salePrice || 0), 0),
        grossProfit: sold.reduce((sum, product) => sum + (product.profit || 0), 0),
        units: sold.length,
        forecast: false,
      } satisfies ForecastPoint
    })
  }, [historyMonths, products])

  const projection = useMemo(() => {
    const recent = history.slice(-3)
    const avgRevenue = recent.reduce((sum, point) => sum + point.revenue, 0) / Math.max(recent.length, 1)
    const avgGrossProfit = recent.reduce((sum, point) => sum + point.grossProfit, 0) / Math.max(recent.length, 1)
    const avgUnits = recent.reduce((sum, point) => sum + point.units, 0) / Math.max(recent.length, 1)
    const margin = avgRevenue > 0 ? avgGrossProfit / avgRevenue : 0

    const firstRevenue = recent[0]?.revenue ?? 0
    const lastRevenue = recent[recent.length - 1]?.revenue ?? 0
    const rawTrend = firstRevenue > 0 && recent.length > 1
      ? (lastRevenue - firstRevenue) / firstRevenue / (recent.length - 1)
      : 0
    const monthlyTrend = Math.max(-0.25, Math.min(0.25, rawTrend))

    const now = new Date()
    return Array.from({ length: forecastMonths }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() + index + 1, 1)
      const factor = Math.max(0, 1 + monthlyTrend * (index + 1))
      const revenue = avgRevenue * factor
      return {
        key: `forecast-${index}`,
        label: date.toLocaleString('en-GB', { month: 'short' }),
        revenue,
        grossProfit: revenue * margin,
        units: Math.max(0, Math.round(avgUnits * factor)),
        forecast: true,
      } satisfies ForecastPoint
    })
  }, [forecastMonths, history])

  const monthlyExpenses = useMemo(() => {
    if (!expenses.length) return 0
    const dated = expenses.filter((expense) => expense.expenseDate)
    if (!dated.length) return 0
    const months = new Set(
      dated.map((expense) => {
        const date = new Date(expense.expenseDate)
        return `${date.getFullYear()}-${date.getMonth()}`
      }),
    )
    return dated.reduce((sum, expense) => sum + expense.amount, 0) / Math.max(months.size, 1)
  }, [expenses])

  const totals = useMemo(() => {
    const projectedRevenue = projection.reduce((sum, point) => sum + point.revenue, 0)
    const projectedGross = projection.reduce((sum, point) => sum + point.grossProfit, 0)
    const projectedExpenses = monthlyExpenses * projection.length
    const projectedNet = projectedGross - projectedExpenses
    const projectedTax = taxEstimate(projectedNet).totalTax
    const projectedUnits = projection.reduce((sum, point) => sum + point.units, 0)

    return {
      projectedRevenue,
      projectedGross,
      projectedExpenses,
      projectedNet,
      projectedTax,
      projectedUnits,
    }
  }, [monthlyExpenses, projection])

  const combined = [...history, ...projection]
  const maxRevenue = Math.max(1, ...combined.map((point) => point.revenue))
  const nextMonth = projection[0]
  const latestActual = history[history.length - 1]
  const nextMonthChange = latestActual?.revenue && nextMonth
    ? ((nextMonth.revenue - latestActual.revenue) / latestActual.revenue) * 100
    : 0

  return (
    <div className="forecast-v2">
      <div className="forecast-controls-v2">
        <div>
          <span>History</span>
          <div className="forecast-segment-v2">
            <button type="button" className={historyMonths === 6 ? 'active' : ''} onClick={() => setHistoryMonths(6)}>6 months</button>
            <button type="button" className={historyMonths === 12 ? 'active' : ''} onClick={() => setHistoryMonths(12)}>12 months</button>
          </div>
        </div>
        <div>
          <span>Forecast horizon</span>
          <div className="forecast-segment-v2">
            <button type="button" className={forecastMonths === 3 ? 'active' : ''} onClick={() => setForecastMonths(3)}>3 months</button>
            <button type="button" className={forecastMonths === 6 ? 'active' : ''} onClick={() => setForecastMonths(6)}>6 months</button>
          </div>
        </div>
      </div>

      <div className="workspace-metric-strip workspace-metric-strip-4">
        <div><span>Next month revenue</span><strong>{money(nextMonth?.revenue ?? 0)}</strong></div>
        <div><span>Forecast revenue</span><strong>{money(totals.projectedRevenue)}</strong></div>
        <div><span>Forecast net profit</span><strong className={totals.projectedNet >= 0 ? 'positive' : 'negative'}>{money(totals.projectedNet)}</strong></div>
        <div><span>Projected units</span><strong>{totals.projectedUnits}</strong></div>
      </div>

      <div className="forecast-main-grid-v2">
        <section className="panel-v2 forecast-chart-v2">
          <header className="panel-v2-header">
            <div><h2>Revenue outlook</h2><p>Actual history followed by SellerHQ's trend-based projection.</p></div>
            <div className={`forecast-change-v2 ${nextMonthChange >= 0 ? 'positive' : 'negative'}`}>
              <Icon name={nextMonthChange >= 0 ? 'trend-up' : 'trend-down'} size={13} />
              {Math.abs(nextMonthChange).toFixed(1)}% next month
            </div>
          </header>

          <div className="forecast-bars-v2">
            {combined.map((point) => (
              <div className={`forecast-column-v2 ${point.forecast ? 'forecast' : ''}`} key={point.key} title={`${point.label}: ${money(point.revenue)}`}>
                <div className="forecast-bar-area-v2">
                  <span style={{ height: `${Math.max(3, (point.revenue / maxRevenue) * 100)}%` }} />
                </div>
                <small>{point.label}</small>
              </div>
            ))}
          </div>
          <div className="forecast-legend-v2"><span><i className="actual" />Actual</span><span><i className="projected" />Forecast</span></div>
        </section>

        <section className="panel-v2 forecast-summary-v2">
          <header className="panel-v2-header"><div><h2>Projected period</h2><p>Expected outcome across the selected horizon.</p></div></header>
          <div className="finance-ledger-v2">
            <ForecastRow label="Revenue" value={money(totals.projectedRevenue)} />
            <ForecastRow label="Gross profit" value={money(totals.projectedGross)} />
            <ForecastRow label="Estimated operating expenses" value={`−${money(totals.projectedExpenses)}`} />
            <ForecastRow label="Projected net profit" value={money(totals.projectedNet)} strong accent />
            <ForecastRow label="Planning tax estimate" value={money(totals.projectedTax)} />
          </div>
          <div className="forecast-method-v2">
            <Icon name="support" size={14} />
            <span>Projection uses the latest three months as a baseline and caps short-term trend extrapolation to avoid extreme forecasts.</span>
          </div>
        </section>
      </div>

      {canUse('cashFlow') && (
        <section className="panel-v2 forecast-cashflow-v2">
          <header className="panel-v2-header"><div><h2>Cash-flow outlook</h2><p>Projected monthly inflow, estimated operating expenses and net contribution.</p></div></header>
          <div className="forecast-cashflow-table-v2">
            <div className="forecast-cashflow-head-v2"><span>Month</span><span>Revenue</span><span>Gross profit</span><span>Expenses</span><span>Net</span></div>
            {projection.map((point) => {
              const net = point.grossProfit - monthlyExpenses
              return (
                <div className="forecast-cashflow-row-v2" key={point.key}>
                  <strong>{point.label}</strong>
                  <span>{money(point.revenue)}</span>
                  <span>{money(point.grossProfit)}</span>
                  <span>−{money(monthlyExpenses)}</span>
                  <strong className={net >= 0 ? 'positive' : 'negative'}>{money(net)}</strong>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function ForecastRow({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className={`finance-row-v2 ${strong ? 'strong' : ''} ${accent ? 'accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default Forecasts