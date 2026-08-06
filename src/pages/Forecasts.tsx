import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useProducts } from '../hooks/useProducts'
import { useExpenses } from '../hooks/useExpenses'
import { useCurrency } from '../hooks/useCurrency'
import { useSubscription } from '../hooks/useSubscription'
import { taxEstimate } from '../lib/finance'
import type { Product } from '../types/product'
import { FilterBar } from '../components/FilterBar'

const periodOptions = ['All time', 'This year', 'This quarter', 'This month', 'Custom']
const forecastTypes = ['Revenue', 'Profit', 'Units', 'Growth']

function generateHistoricalData(products: Product[], months: number) {
  const data = []
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months + 1)
  
  for (let i = 0; i < months; i++) {
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + i)
    const monthStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    
    const monthProducts = products.filter(p => {
      const productDate = new Date(p.saleDate || p.createdAt)
      return productDate.getMonth() === date.getMonth() && 
             productDate.getFullYear() === date.getFullYear()
    })
    
    const revenue = monthProducts.reduce((sum, p) => sum + (p.salePrice || 0), 0)
    const profit = monthProducts.reduce((sum, p) => sum + p.profit, 0)
    const units = monthProducts.length

    data.push({
      month: monthStr,
      revenue,
      profit,
      units,
      margin: units > 0 && revenue > 0 ? (profit / revenue) * 100 : 0,
    })
  }
  
  return data
}

type ForecastDataPoint = {
  month: string
  revenue: number
  profit: number
  units: number
  margin: number
  forecast?: boolean
}

function calculateForecast(data: ForecastDataPoint[], monthsToForecast: number) {
  if (data.length === 0) return []
  
  const recent = data.slice(-3)
  const avgRevenue = recent.reduce((sum, d) => sum + d.revenue, 0) / recent.length
  const avgProfit = recent.reduce((sum, d) => sum + d.profit, 0) / recent.length
  const avgUnits = recent.reduce((sum, d) => sum + d.units, 0) / recent.length
  const avgMargin = data.reduce((sum, d) => sum + d.margin, 0) / data.length
  
  // Calculate trend from recent data
  const trend = recent.length >= 2
    ? (recent[recent.length - 1].revenue - recent[0].revenue) / recent[0].revenue / recent.length
    : 0
  
  const forecast = []
  for (let i = 1; i <= monthsToForecast; i++) {
    const trendFactor = 1 + trend * i
    forecast.push({
      month: `Forecast ${i}`,
      revenue: avgRevenue * trendFactor,
      profit: avgProfit * trendFactor,
      units: Math.round(avgUnits * trendFactor),
      margin: avgMargin,
      forecast: true,
    })
  }
  
  return forecast
}

function calculateGrowthRates(data: ForecastDataPoint[]) {
  if (data.length < 2) return { revenueGrowth: 0, profitGrowth: 0, unitsGrowth: 0 }
  
  const recent = data.slice(-3)
  const previous = data.slice(-6, -3)
  
  if (recent.length === 0 || previous.length === 0) return { revenueGrowth: 0, profitGrowth: 0, unitsGrowth: 0 }
  
  const recentRevenue = recent.reduce((sum, d) => sum + d.revenue, 0) / recent.length
  const previousRevenue = previous.reduce((sum, d) => sum + d.revenue, 0) / previous.length
  const revenueGrowth = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0
  
  const recentProfit = recent.reduce((sum, d) => sum + d.profit, 0) / recent.length
  const previousProfit = previous.reduce((sum, d) => sum + d.profit, 0) / previous.length
  const profitGrowth = previousProfit > 0 ? ((recentProfit - previousProfit) / previousProfit) * 100 : 0
  
  const recentUnits = recent.reduce((sum, d) => sum + d.units, 0) / recent.length
  const previousUnits = previous.reduce((sum, d) => sum + d.units, 0) / previous.length
  const unitsGrowth = previousUnits > 0 ? ((recentUnits - previousUnits) / previousUnits) * 100 : 0
  
  return { revenueGrowth, profitGrowth, unitsGrowth }
}

function drawSimpleChart(data: ForecastDataPoint[], type: string, height: number = 60) {
  if (data.length === 0) return ''
  
  const maxValue = Math.max(...data.map(d => 
    type === 'revenue' ? d.revenue :
    type === 'profit' ? d.profit :
    type === 'units' ? d.units : d.margin
  ))
  
  const minValue = Math.min(...data.map(d => 
    type === 'revenue' ? d.revenue :
    type === 'profit' ? d.profit :
    type === 'units' ? d.units : d.margin
  ))
  
  const chart = []
  for (let row = 0; row < height; row++) {
    const line = []
    for (let col = 0; col < Math.min(data.length, 8); col++) {
      const value = type === 'revenue' ? data[col]?.revenue :
                   type === 'profit' ? data[col]?.profit :
                   type === 'units' ? data[col]?.units : data[col]?.margin
      
      const barHeight = maxValue > minValue ? ((value - minValue) / (maxValue - minValue)) * (height - 2) : 0
      const isBar = row >= height - 2 - barHeight && row < height - 2
      
      line.push(isBar ? '█' : ' ')
    }
    chart.push(line.join(''))
  }
  
  return chart.join('\n')
}

function getHealthStatus(margin: number): { status: string; color: string } {
  if (margin >= 30) return { status: 'Excellent', color: '#10b981' }
  if (margin >= 20) return { status: 'Good', color: '#3b82f6' }
  if (margin >= 10) return { status: 'Fair', color: '#f59e0b' }
  return { status: 'Needs Improvement', color: '#ef4444' }
}

function Forecast() {
  const navigate = useNavigate()
  const { products } = useProducts()
  const { expenses } = useExpenses()
  const { money } = useCurrency()
  const { canUse } = useSubscription()

  const [selectedPeriod, setSelectedPeriod] = useState('This year')
  const [selectedForecastType, setSelectedForecastType] = useState('Revenue')
  const [showPredictions, setShowPredictions] = useState(true)
  const [volumeChange, setVolumeChange] = useState(0)
  const [priceChange, setPriceChange] = useState(0)

  const historicalData = useMemo(() => {
    const months = selectedPeriod === 'All time' ? 12 : 
                   selectedPeriod === 'This year' ? 12 :
                   selectedPeriod === 'This quarter' ? 3 :
                   selectedPeriod === 'This month' ? 1 : 6
    return generateHistoricalData(products, months)
  }, [products, selectedPeriod])

  const forecastData = useMemo(() => {
    if (!showPredictions) return []
    const monthsToForecast = selectedPeriod === 'All time' ? 6 : 
                             selectedPeriod === 'This year' ? 3 :
                             selectedPeriod === 'This quarter' ? 1 :
                             selectedPeriod === 'This month' ? 1 : 3
    return calculateForecast(historicalData, monthsToForecast)
  }, [historicalData, selectedPeriod, showPredictions])

  const growthRates = useMemo(() => {
    return calculateGrowthRates(historicalData)
  }, [historicalData])

  const currentMetrics = useMemo(() => {
    const totalRevenue = historicalData.reduce((sum, d) => sum + d.revenue, 0)
    const totalProfit = historicalData.reduce((sum, d) => sum + d.profit, 0)
    const totalUnits = historicalData.reduce((sum, d) => sum + d.units, 0)
    const avgMargin = historicalData.length > 0 ? 
      (historicalData.reduce((sum, d) => sum + d.margin, 0) / historicalData.length) : 0
    
    const forecastMetrics = forecastData.reduce((sum, d) => sum + d.revenue, 0)
    const forecastProfit = forecastData.reduce((sum, d) => sum + d.profit, 0)
    
    return {
      totalRevenue,
      totalProfit,
      totalUnits,
      avgMargin,
      forecastRevenue: forecastMetrics,
      forecastProfit,
      forecastGrowth: totalRevenue > 0 ? ((forecastMetrics - totalRevenue) / totalRevenue) * 100 : 0,
    }
  }, [historicalData, forecastData])

  const baselineSold = products.filter((p) => p.status === 'Sold')
  const baselineRevenue = baselineSold.reduce((sum, p) => sum + (p.salePrice || 0), 0)
  const baselineProfit = baselineSold.reduce((sum, p) => sum + (p.profit || 0), 0)
  const baselineExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const baselineUnits = baselineSold.length
  const baselineAvgPrice = baselineUnits > 0 ? baselineRevenue / baselineUnits : 0

  const scenario = useMemo(() => {
    const newUnits = Math.round(baselineUnits * (1 + volumeChange / 100))
    const newAvgPrice = Math.max(0, baselineAvgPrice + priceChange)
    const newRevenue = newUnits * newAvgPrice
    const baselineMargin = baselineRevenue > 0 ? baselineProfit / baselineRevenue : 0
    const newProfit = newRevenue * baselineMargin
    const newNet = newProfit - baselineExpenses
    const newTax = taxEstimate(newNet)
    const revenueDelta = newRevenue - baselineRevenue
    const profitDelta = newProfit - baselineProfit
    return {
      newUnits,
      newAvgPrice,
      newRevenue,
      newProfit,
      newNet,
      newTax: newTax.totalTax,
      revenueDelta,
      profitDelta,
    }
  }, [baselineUnits, baselineAvgPrice, baselineRevenue, baselineProfit, baselineExpenses, volumeChange, priceChange])

  const getMetricChange = (current: number, previous: number) => {
    if (previous === 0) return { value: current, change: 0, trend: 'up' as const }
    const change = ((current - previous) / previous) * 100
    return { value: current, change, trend: change >= 0 ? 'up' : 'down' as const }
  }

  const revenueChange = getMetricChange(currentMetrics.forecastRevenue, currentMetrics.totalRevenue)
  const profitChange = getMetricChange(currentMetrics.forecastProfit, currentMetrics.totalProfit)
  const marginChange = getMetricChange(
    forecastData.length > 0 ? (forecastData.reduce((sum, d) => sum + d.margin, 0) / forecastData.length) : 0,
    currentMetrics.avgMargin
  )

  const quickStats = [
    { label: 'Average monthly revenue', value: money(currentMetrics.totalRevenue / Math.max(historicalData.length, 1), { maximumFractionDigits: 0 }) },
    { label: 'Average monthly profit', value: money(currentMetrics.totalProfit / Math.max(historicalData.length, 1), { maximumFractionDigits: 0 }) },
    { label: 'Average margin', value: `${currentMetrics.avgMargin.toFixed(1)}%` },
    { label: 'Forecast next month', value: money(currentMetrics.forecastRevenue / Math.max(forecastData.length || 1, 1), { maximumFractionDigits: 0 }) },
  ]

  const topPerformingProducts = useMemo(() => {
    return products
      .filter(p => p.status === 'Sold' && p.salePrice !== null)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)
  }, [products])

  const healthStatus = useMemo(() => {
    return getHealthStatus(currentMetrics.avgMargin)
  }, [currentMetrics.avgMargin])

  const cashFlow = useMemo(() => {
    if (forecastData.length === 0) return []

    const historicalRevenue = historicalData.reduce(
      (sum, d) => sum + d.revenue,
      0,
    )
    const historicalProfit = historicalData.reduce(
      (sum, d) => sum + d.profit,
      0,
    )
    const cogsRatio =
      historicalRevenue > 0
        ? Math.max(0, (historicalRevenue - historicalProfit) / historicalRevenue)
        : 0.6

    const monthlyExpenses =
      expenses.reduce((sum, e) => sum + (e.amount || 0), 0) /
      Math.max(historicalData.length, 1)

    let cumulative = 0
    return forecastData.map((point) => {
      const inflow = point.revenue
      const cogs = inflow * cogsRatio
      const outflow = cogs + monthlyExpenses
      const net = inflow - outflow
      cumulative += net
      return { month: point.month, inflow, cogs, expenses: monthlyExpenses, net, cumulative }
    })
  }, [forecastData, historicalData, expenses])

  return (
    <div className="inventory-page">
      <div className="page-heading">
        <div>
          <h1>Forecast</h1>
          <p>Project your sales performance and plan your business growth.</p>
        </div>
      </div>

      <div className="inventory-stats">
        <div className="inventory-stat inventory-stat-listed">
          <span>Historical revenue</span>
          <strong>{money(currentMetrics.totalRevenue, { maximumFractionDigits: 0 })}</strong>
          <span className={`stat-label ${revenueChange.trend === 'up' ? 'positive' : 'negative'}`}>
            {revenueChange.trend === 'up' ? '↑' : '↓'} {Math.abs(revenueChange.change).toFixed(1)}%
          </span>
        </div>

        <div className="inventory-stat">
          <span>Historical profit</span>
          <strong>{money(currentMetrics.totalProfit, { maximumFractionDigits: 0 })}</strong>
          <span className={`stat-label ${profitChange.trend === 'up' ? 'positive' : 'negative'}`}>
            {profitChange.trend === 'up' ? '↑' : '↓'} {Math.abs(profitChange.change).toFixed(1)}%
          </span>
        </div>

        <div className="inventory-stat">
          <span>Average margin</span>
          <strong>{currentMetrics.avgMargin.toFixed(1)}%</strong>
          <span className={`stat-label ${marginChange.trend === 'up' ? 'positive' : 'negative'}`}>
            {marginChange.trend === 'up' ? '↑' : '↓'} {Math.abs(marginChange.change).toFixed(1)}%
          </span>
        </div>

        <div className="inventory-stat">
          <span>Forecast growth</span>
          <strong>+{currentMetrics.forecastGrowth.toFixed(1)}%</strong>
          <span className="stat-label positive">Predicted</span>
        </div>
      </div>

      <FilterBar
        filtersActive={false}
      >
        <select
          value={selectedPeriod}
          onChange={(event) => setSelectedPeriod(event.target.value)}
        >
          {periodOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          value={selectedForecastType}
          onChange={(event) => setSelectedForecastType(event.target.value)}
        >
          {forecastTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <button
          type="button"
          className={`secondary-button ${showPredictions ? 'active' : ''}`}
          onClick={() => setShowPredictions(!showPredictions)}
        >
          {showPredictions ? 'Hide predictions' : 'Show predictions'}
        </button>
      </FilterBar>

      <div className="inventory-stats">
        {quickStats.map((stat, index) => (
          <div key={index} className="inventory-stat">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>Scenario planning</h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--shq-ink-muted)' }}>
          Adjust the sliders to model the impact on revenue, profit, tax and cash flow.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
              <span>Volume change</span>
              <span style={{ color: 'var(--shq-ink-muted)' }}>{volumeChange > 0 ? '+' : ''}{volumeChange}%</span>
            </label>
            <input
              type="range"
              min="-50"
              max="50"
              step="5"
              value={volumeChange}
              onChange={(e) => setVolumeChange(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--shq-ink-faint)' }}>
              <span>-50%</span><span>0</span><span>+50%</span>
            </div>
          </div>
          <div>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
              <span>Average sale price change</span>
              <span style={{ color: 'var(--shq-ink-muted)' }}>{priceChange > 0 ? '+' : ''}{money(priceChange, { maximumFractionDigits: 0 })}</span>
            </label>
            <input
              type="range"
              min="-20"
              max="20"
              step="1"
              value={priceChange}
              onChange={(e) => setPriceChange(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--shq-ink-faint)' }}>
              <span>-£20</span><span>0</span><span>+£20</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '24px' }}>
          <div style={{ padding: '16px', background: 'var(--shq-bg)', borderRadius: '10px', border: '1px solid var(--shq-border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--shq-ink-muted)', marginBottom: '6px' }}>Projected revenue</div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>{money(scenario.newRevenue, { maximumFractionDigits: 0 })}</div>
            <div style={{ fontSize: '12px', color: scenario.revenueDelta >= 0 ? '#10b981' : '#ef4444' }}>
              {scenario.revenueDelta >= 0 ? '+' : ''}{money(scenario.revenueDelta, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div style={{ padding: '16px', background: 'var(--shq-bg)', borderRadius: '10px', border: '1px solid var(--shq-border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--shq-ink-muted)', marginBottom: '6px' }}>Projected profit</div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>{money(scenario.newProfit, { maximumFractionDigits: 0 })}</div>
            <div style={{ fontSize: '12px', color: scenario.profitDelta >= 0 ? '#10b981' : '#ef4444' }}>
              {scenario.profitDelta >= 0 ? '+' : ''}{money(scenario.profitDelta, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div style={{ padding: '16px', background: 'var(--shq-bg)', borderRadius: '10px', border: '1px solid var(--shq-border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--shq-ink-muted)', marginBottom: '6px' }}>Est. tax liability</div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>{money(scenario.newTax, { maximumFractionDigits: 0 })}</div>
            <div style={{ fontSize: '12px', color: 'var(--shq-ink-faint)' }}>on net {money(scenario.newNet, { maximumFractionDigits: 0 })}</div>
          </div>
          <div style={{ padding: '16px', background: 'var(--shq-bg)', borderRadius: '10px', border: '1px solid var(--shq-border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--shq-ink-muted)', marginBottom: '6px' }}>Projected units</div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>{scenario.newUnits}</div>
            <div style={{ fontSize: '12px', color: 'var(--shq-ink-faint)' }}>avg {money(scenario.newAvgPrice, { maximumFractionDigits: 0 })}</div>
          </div>
        </div>
      </div>

      {canUse('cashFlow') && cashFlow.length > 0 && (
        <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>Cash-flow projection</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--shq-ink-muted)' }}>
            Forecast of money in and out over the projected period, based on historical cost ratios and average monthly expenses.
          </p>
          <div className="table-wrapper">
            <table className="inventory-table" style={{ minWidth: 0 }}>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Cash in</th>
                  <th>Cost of goods</th>
                  <th>Expenses</th>
                  <th>Net</th>
                  <th>Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {cashFlow.map((row) => (
                  <tr key={row.month}>
                    <td data-label="Period">{row.month}</td>
                    <td data-label="Cash in">{money(row.inflow, { maximumFractionDigits: 0 })}</td>
                    <td data-label="Cost of goods">-{money(row.cogs, { maximumFractionDigits: 0 })}</td>
                    <td data-label="Expenses">-{money(row.expenses, { maximumFractionDigits: 0 })}</td>
                    <td data-label="Net" style={{ color: row.net >= 0 ? '#059669' : '#dc2626', fontWeight: 600 }}>
                      {money(row.net, { maximumFractionDigits: 0 })}
                    </td>
                    <td data-label="Cumulative" style={{ color: row.cumulative >= 0 ? 'var(--shq-ink)' : '#dc2626', fontWeight: 600 }}>
                      {money(row.cumulative, { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--shq-ink-muted)' }}>
            {cashFlow.length > 0 && cashFlow[cashFlow.length - 1].cumulative >= 0
              ? 'Projected cumulative cash position is positive over this period.'
              : 'Projected cumulative cash position is negative - consider raising prices or cutting costs.'}
          </div>
        </div>
      )}

      <div data-mobile-hide style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <div>
          <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
              Historical {selectedForecastType} Trend
            </h3>
            <div style={{ 
              fontFamily: 'monospace', 
              fontSize: '12px', 
              background: 'var(--shq-bg)', 
              padding: '12px', 
              borderRadius: '6px',
              overflow: 'auto'
            }}>
              <pre>{drawSimpleChart(historicalData, selectedForecastType.toLowerCase(), 30)}</pre>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '11px', color: 'var(--shq-ink-muted)' }}>
              {historicalData.slice(0, 8).map((data, index) => (
                <span key={index}>{data.month}</span>
              ))}
            </div>
          </div>

          {showPredictions && forecastData.length > 0 && (
            <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
                Predictions
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                {forecastData.map((data, index) => (
                  <div key={index} style={{ 
                    background: index === 0 ? '#f0fdf4' : 'var(--shq-surface)',
                    border: index === 0 ? '1px solid #10b981' : '1px solid var(--shq-border)',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--shq-ink-muted)', marginBottom: '4px' }}>
                      {data.month}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: index === 0 ? '#059669' : 'var(--shq-ink)' }}>
                      {selectedForecastType === 'Revenue' ? money(data.revenue, { maximumFractionDigits: 0 }) :
                       selectedForecastType === 'Profit' ? money(data.profit, { maximumFractionDigits: 0 }) :
                       selectedForecastType === 'Units' ? `${data.units}` : `${data.margin.toFixed(1)}%`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
              Business Health
            </h3>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: `${healthStatus.color}20`,
                border: `2px solid ${healthStatus.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto'
              }}>
                <span style={{ fontSize: '20px', fontWeight: '700', color: healthStatus.color }}>
                  {healthStatus.status === 'Excellent' ? '★' : healthStatus.status === 'Good' ? '★' : healthStatus.status === 'Fair' ? '◆' : '◆'}
                </span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: healthStatus.color, marginBottom: '4px' }}>
                {healthStatus.status}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--shq-ink-muted)' }}>
                Based on current performance
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
              Top performing products
            </h3>
            {topPerformingProducts.length > 0 ? (
              <div>
                {topPerformingProducts.map((product, index) => (
                  <div key={product.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: index < topPerformingProducts.length - 1 ? '1px solid #f1f2f4' : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%',
                        background: `#${Math.floor(Math.random() * 16777215).toString(16)}20`,
                        border: `1px solid #${Math.floor(Math.random() * 16777215).toString(16)}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {index + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>
                          {product.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--shq-ink-muted)' }}>
                          {product.code} • {product.marketplaces?.join(', ') || 'No marketplaces'}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>
                        {money(product.profit, { maximumFractionDigits: 0 })}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--shq-ink-muted)' }}>
                        Profit
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--shq-ink-muted)' }}>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                  No sales data available
                </div>
                <div style={{ fontSize: '12px' }}>
                  Make some sales to see top performers
                </div>
              </div>
            )}
          </div>

          <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
              Quick insights
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '16px' }}>📊</span>
                <div style={{ fontSize: '13px' }}>
                  <strong>Revenue trend:</strong> {growthRates.revenueGrowth >= 0 ? 'Growing' : 'Declining'}
                  <span style={{ color: growthRates.revenueGrowth >= 0 ? '#059669' : '#dc2626', fontSize: '12px', marginLeft: '4px' }}>
                    ({growthRates.revenueGrowth >= 0 ? '+' : ''}{growthRates.revenueGrowth.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '16px' }}>💰</span>
                <div style={{ fontSize: '13px' }}>
                  <strong>Profit margin:</strong> {currentMetrics.avgMargin >= 20 ? 'Strong' : currentMetrics.avgMargin >= 10 ? 'Average' : 'Weak'}
                  <span style={{ color: currentMetrics.avgMargin >= 20 ? '#059669' : currentMetrics.avgMargin >= 10 ? '#d97706' : '#dc2626', fontSize: '12px', marginLeft: '4px' }}>
                    ({currentMetrics.avgMargin.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '16px' }}>📈</span>
                <div style={{ fontSize: '13px' }}>
                  <strong>Forecast confidence:</strong> Medium
                  <span style={{ color: 'var(--shq-ink-muted)', fontSize: '12px', marginLeft: '4px' }}>
                    Based on historical patterns
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <button
          type="button"
          className="primary-button"
          onClick={() => navigate('/sales')}
          style={{ marginRight: '12px' }}
        >
          View detailed sales report
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate('/inventory')}
        >
          Manage inventory
        </button>
      </div>
    </div>
  )
}

export default Forecast