import { useMemo, useState } from 'react'

import { useProducts } from '../hooks/useProducts'
import { useExpenses } from '../hooks/useExpenses'
import { useCurrency } from '../hooks/useCurrency'
import { downloadCsv } from '../utils/format'
import { useToast } from '../hooks/useToast'
import {
  periodRange,
  soldInPeriod,
  expensesInPeriod,
  revenue,
  costOfGoods,
  totalFees,
  grossProfit,
  expenseTotal,
  netProfit,
  profitMargin,
  averageSaleValue,
  averageProfitPerItem,
  sellThroughRate,
  groupByMarketplace,
  groupByMonth,
  bestPerforming,
  stockAgeingBuckets,
  taxEstimate,
  type Period,
} from '../lib/finance'

const periodLabels: Record<Period, string> = {
  today: 'Today',
  week: 'Last 7 days',
  month: 'This month',
  year: 'This year',
  all: 'All time',
}

function Reports() {
  const { products, loading } = useProducts()
  const { expenses } = useExpenses()
  const { money } = useCurrency()
  const { showToast } = useToast()

  const [period, setPeriod] = useState<Period>('year')

  const range = useMemo(() => periodRange(period), [period])

  const periodSold = useMemo(
    () => soldInPeriod(products, range),
    [products, range],
  )

  const periodExpenses = useMemo(
    () => expensesInPeriod(expenses, range),
    [expenses, range],
  )

  const allSold = useMemo(
    () => products.filter((p) => p.status === 'Sold'),
    [products],
  )

  const rev = useMemo(() => revenue(periodSold), [periodSold])
  const cogs = useMemo(() => costOfGoods(periodSold), [periodSold])
  const fees = useMemo(() => totalFees(periodSold), [periodSold])
  const gross = useMemo(() => grossProfit(periodSold), [periodSold])
  const expTotal = useMemo(() => expenseTotal(periodExpenses), [periodExpenses])
  const net = useMemo(() => netProfit(periodSold, periodExpenses), [periodSold, periodExpenses])
  const margin = useMemo(() => profitMargin(rev, gross), [rev, gross])
  const tax = useMemo(() => taxEstimate(net), [net])

  const avgSale = useMemo(() => averageSaleValue(periodSold), [periodSold])
  const avgProfit = useMemo(() => averageProfitPerItem(periodSold), [periodSold])

  const marketplaceData = useMemo(() => groupByMarketplace(periodSold), [periodSold])
  const monthlyData = useMemo(() => groupByMonth(periodSold).slice(-12), [periodSold])
  const topBrands = useMemo(() => bestPerforming(periodSold, 'brand').slice(0, 8), [periodSold])
  const topCategories = useMemo(() => bestPerforming(periodSold, 'category').slice(0, 8), [periodSold])
  const ageing = useMemo(() => stockAgeingBuckets(products), [products])

  const sellThrough = useMemo(() => sellThroughRate(products), [products])
  const unsoldCount = useMemo(
    () => products.filter((p) => p.status !== 'Sold').length,
    [products],
  )

  function handleExportPnl() {
    downloadCsv('profit-and-loss.csv', [
      ['Metric', 'Value'],
      ['Revenue', String(rev.toFixed(2))],
      ['Cost of goods sold', String(cogs.toFixed(2))],
      ['Platform fees', String(fees.toFixed(2))],
      ['Gross profit', String(gross.toFixed(2))],
      ['Expenses', String(expTotal.toFixed(2))],
      ['Net profit', String(net.toFixed(2))],
      ['Net margin %', String(margin.toFixed(1))],
      ['', ''],
      ['Taxable profit', String(tax.taxableProfit.toFixed(2))],
      ['Income tax', String(tax.incomeTax.toFixed(2))],
      ['Class 4 NI', String(tax.ni.toFixed(2))],
      ['Total tax estimate', String(tax.totalTax.toFixed(2))],
    ])
    showToast('P&L exported', 'success')
  }

  function handleExportMarketplaceCsv() {
    if (marketplaceData.length === 0) {
      showToast('No data to export', 'error')
      return
    }
    downloadCsv('marketplace-report.csv', [
      ['Marketplace', 'Revenue', 'Profit', 'Units sold'],
      ...marketplaceData.map((m) => [
        m.marketplace,
        String(m.revenue.toFixed(2)),
        String(m.profit.toFixed(2)),
        String(m.count),
      ]),
    ])
    showToast('Marketplace report exported', 'success')
  }

  return (
    <div className="inventory-page">
      <div className="page-heading">
        <div>
          <h1>Reports</h1>
          <p>Business performance overview and financial breakdown.</p>
        </div>
        <div className="page-heading-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={handleExportPnl}
          >
            Export P&L
          </button>
        </div>
      </div>

      <div className="period-tabs">
        {(['today', 'week', 'month', 'year', 'all'] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            className={`period-tab ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      <div className="inventory-stats">
        <div className="inventory-stat">
          <span>Revenue</span>
          <strong>{money(rev)}</strong>
        </div>
        <div className="inventory-stat">
          <span>Gross profit</span>
          <strong>{money(gross)}</strong>
        </div>
        <div className="inventory-stat">
          <span>Net profit</span>
          <strong style={{ color: net >= 0 ? 'var(--shq-success)' : 'var(--shq-error)' }}>
            {money(net)}
          </strong>
        </div>
        <div className="inventory-stat">
          <span>Net margin</span>
          <strong>{margin.toFixed(1)}%</strong>
        </div>
        <div className="inventory-stat">
          <span>Sales count</span>
          <strong>{periodSold.length}</strong>
        </div>
        <div className="inventory-stat">
          <span>Avg sale</span>
          <strong>{money(avgSale)}</strong>
        </div>
        <div className="inventory-stat">
          <span>Avg profit/item</span>
          <strong>{money(avgProfit)}</strong>
        </div>
        <div className="inventory-stat">
          <span>Tax estimate</span>
          <strong>{money(tax.totalTax)}</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Profit & Loss */}
        <div className="inventory-modal-section">
          <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 16px' }}>
            <span>Profit &amp; Loss</span>
            <span style={{ fontSize: 12, color: 'var(--shq-ink-muted)', fontWeight: 400 }}>{periodLabels[period]}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: 13 }}>
            <Row label="Revenue" value={money(rev)} />
            <Row label="Cost of goods sold" value={`-${money(cogs)}`} muted />
            <Row label="Platform fees" value={`-${money(fees)}`} muted />
            <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid var(--shq-border)' }} />
            <Row label="Gross profit" value={money(gross)} bold />
            <Row label="Operating expenses" value={`-${money(expTotal)}`} muted />
            <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid var(--shq-border)' }} />
            <Row label="Net profit" value={money(net)} bold highlight={net >= 0} />
          </div>
        </div>

        {/* Tax Summary */}
        <div className="inventory-modal-section">
          <h3 style={{ margin: '0 0 16px' }}>Tax summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: 13 }}>
            <Row label="Net profit" value={money(net)} />
            <Row label="Personal allowance" value={`-${money(25000)}`} muted />
            <Row label="Taxable profit" value={money(tax.taxableProfit)} />
            <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid var(--shq-border)' }} />
            <Row label="Income tax" value={money(tax.incomeTax)} />
            <Row label="Class 4 NI" value={money(tax.ni)} />
            <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid var(--shq-border)' }} />
            <Row label="Total tax estimate" value={money(tax.totalTax)} bold />
            <div style={{ fontSize: 11, color: 'var(--shq-ink-muted)', marginTop: 4 }}>
              Effective rate: {net > 0 ? ((tax.totalTax / net) * 100).toFixed(1) : '0.0'}% of net profit
            </div>
          </div>
        </div>

        {/* Inventory Health */}
        <div className="inventory-modal-section">
          <h3 style={{ margin: '0 0 16px' }}>Inventory health</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: 13 }}>
            <Row label="Total products" value={String(products.length)} />
            <Row label="Unsold (in stock)" value={String(unsoldCount)} />
            <Row label="Sold" value={String(allSold.length)} />
            <Row label="Sell-through rate" value={`${sellThrough.toFixed(1)}%`} />
            <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid var(--shq-border)' }} />
            <h4 style={{ margin: '8px 0 4px', fontSize: 12, fontWeight: 600 }}>Stock ageing</h4>
            {ageing.map((b) => (
              <div key={b.bucket} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>{b.bucket}</span>
                <span>{b.count} items · {money(b.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Marketplace & Monthly */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div className="inventory-modal-section">
          <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 16px' }}>
            <span>Sales by marketplace</span>
            <button
              type="button"
              className="row-action-link"
              style={{ fontSize: 11 }}
              onClick={handleExportMarketplaceCsv}
            >
              Export
            </button>
          </h3>
          {marketplaceData.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--shq-ink-muted)' }}>No sales data for this period.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {marketplaceData.map((m) => {
                const pct = rev > 0 ? (m.revenue / rev) * 100 : 0
                return (
                  <div key={m.marketplace}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0' }}>
                      <span>{m.marketplace}</span>
                      <span>{m.count} sales · {money(m.revenue)} · {money(m.profit)} profit</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--shq-border)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--shq-primary)', borderRadius: 2 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="inventory-modal-section">
          <h3 style={{ margin: '0 0 16px' }}>Monthly trend</h3>
          {monthlyData.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--shq-ink-muted)' }}>No sales data for this period.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {monthlyData.map((m) => {
                const maxRev = Math.max(...monthlyData.map((x) => x.revenue), 1)
                const pct = (m.revenue / maxRev) * 100
                return (
                  <div key={m.month}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                      <span>{m.month}</span>
                      <span>{money(m.revenue)} · {money(m.profit)} profit</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--shq-border)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--shq-success)', borderRadius: 2 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Performers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div className="inventory-modal-section">
          <h3 style={{ margin: '0 0 16px' }}>Top brands</h3>
          {topBrands.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--shq-ink-muted)' }}>No data.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {topBrands.map((b, i) => (
                <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--shq-border)' }}>
                  <span>
                    <span style={{ color: 'var(--shq-ink-muted)', marginRight: 6 }}>#{i + 1}</span>
                    {b.name}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <strong>{money(b.profit)}</strong>
                    <span style={{ fontSize: 11, color: 'var(--shq-ink-muted)', marginLeft: 6 }}>{b.count} sold</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="inventory-modal-section">
          <h3 style={{ margin: '0 0 16px' }}>Top categories</h3>
          {topCategories.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--shq-ink-muted)' }}>No data.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {topCategories.map((c, i) => (
                <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--shq-border)' }}>
                  <span>
                    <span style={{ color: 'var(--shq-ink-muted)', marginRight: 6 }}>#{i + 1}</span>
                    {c.name}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <strong>{money(c.profit)}</strong>
                    <span style={{ fontSize: 11, color: 'var(--shq-ink-muted)', marginLeft: 6 }}>{c.count} sold</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="inventory-loading" style={{ minHeight: 200 }}>
          <div className="inventory-spinner" />
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  muted,
  bold,
  highlight,
}: {
  label: string
  value: string
  muted?: boolean
  bold?: boolean
  highlight?: boolean
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
      <span style={{ color: muted ? 'var(--shq-ink-muted)' : undefined }}>{label}</span>
      <strong
        style={{
          color: highlight === false ? 'var(--shq-error)' : highlight ? 'var(--shq-success)' : undefined,
          fontWeight: bold ? 600 : 500,
        }}
      >
        {value}
      </strong>
    </div>
  )
}

export default Reports
