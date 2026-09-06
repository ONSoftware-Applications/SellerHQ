import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import Icon from '../components/Icon'
import WorkspaceShell, { type WorkspaceTab } from '../components/WorkspaceShell'
import { useCurrency } from '../hooks/useCurrency'
import { useExpenses } from '../hooks/useExpenses'
import { useProducts } from '../hooks/useProducts'
import { useReceipts } from '../hooks/useReceipts'
import { useSettings } from '../hooks/useSettings'
import {
  expenseTotal,
  grossProfit,
  netProfit,
  revenue,
  taxEstimate,
} from '../lib/finance'
import Expenses from './Expenses'
import Receipts from './Receipts'
import TaxPlannerV2 from './TaxPlannerV2'

type FinanceView = 'overview' | 'expenses' | 'receipts' | 'tax'

function FinanceWorkspace() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { products } = useProducts()
  const { expenses } = useExpenses()
  const { receipts } = useReceipts()
  const { settings } = useSettings()
  const { money } = useCurrency()

  const allowedViews: FinanceView[] = [
    'overview',
    ...(settings.features.expensesEnabled ? ['expenses' as const] : []),
    ...(settings.features.receiptsEnabled ? ['receipts' as const] : []),
    'tax',
  ]
  const requested = params.get('view') as FinanceView | null
  const view: FinanceView = requested && allowedViews.includes(requested)
    ? requested
    : 'overview'

  const sold = useMemo(() => products.filter((product) => product.status === 'Sold'), [products])
  const rev = revenue(sold)
  const gross = grossProfit(sold)
  const exp = expenseTotal(expenses)
  const net = netProfit(sold, expenses)
  const tax = taxEstimate(net)
  const reserve = settings.tax?.reservedAmount ?? 0
  const reservePercent = tax.totalTax > 0 ? Math.min(100, (reserve / tax.totalTax) * 100) : 100

  const tabs: WorkspaceTab[] = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    ...(settings.features.expensesEnabled
      ? [{ id: 'expenses', label: 'Expenses', icon: 'expenses' as const, badge: expenses.length }]
      : []),
    ...(settings.features.receiptsEnabled
      ? [{ id: 'receipts', label: 'Receipt inbox', icon: 'receipts' as const, badge: receipts.length }]
      : []),
    { id: 'tax', label: 'Tax', icon: 'tax' },
  ]

  return (
    <WorkspaceShell
      title="Finance"
      description="Understand cash movement, operating costs, evidence and tax in one place."
      eyebrow="Finance"
      tabs={tabs}
      activeTab={view}
      onTabChange={(next) => setParams(next === 'overview' ? {} : { view: next })}
    >
      {view === 'overview' ? (
        <div className="finance-overview-v2">
          <div className="workspace-metric-strip workspace-metric-strip-4">
            <div><span>Revenue</span><strong>{money(rev)}</strong></div>
            <div><span>Gross profit</span><strong>{money(gross)}</strong></div>
            <div><span>Operating expenses</span><strong>{money(exp)}</strong></div>
            <div><span>Net profit</span><strong className={net >= 0 ? 'positive' : 'negative'}>{money(net)}</strong></div>
          </div>

          <div className="finance-grid-v2">
            <section className="panel-v2 finance-pnl-v2">
              <header className="panel-v2-header">
                <div><h2>Profit & loss snapshot</h2><p>All-time recorded business performance</p></div>
              </header>
              <div className="finance-ledger-v2">
                <FinanceRow label="Revenue" value={money(rev)} />
                <FinanceRow label="Cost, platform and sale fees" value={money(Math.max(0, rev - gross))} negative />
                <FinanceRow label="Gross profit" value={money(gross)} strong />
                <FinanceRow label="Operating expenses" value={money(exp)} negative />
                <FinanceRow label="Net profit" value={money(net)} strong accent />
              </div>
            </section>

            <section className="panel-v2">
              <header className="panel-v2-header">
                <div><h2>Tax reserve</h2><p>Planning estimate versus amount set aside</p></div>
                <button type="button" className="panel-v2-link" onClick={() => setParams({ view: 'tax' })}>
                  Tax workspace <Icon name="arrow-right" size={12} />
                </button>
              </header>
              <div className="reserve-v2">
                <div className="reserve-v2-head">
                  <div><span>Estimated liability</span><strong>{money(tax.totalTax)}</strong></div>
                  <div><span>Reserved</span><strong>{money(reserve)}</strong></div>
                </div>
                <div className="reserve-v2-track"><span style={{ width: `${reservePercent}%` }} /></div>
                <p>{tax.totalTax > reserve ? `${money(tax.totalTax - reserve)} still to reserve.` : 'Your recorded reserve currently covers the estimate.'}</p>
              </div>
            </section>

            {settings.features.expensesEnabled && (
              <section className="panel-v2">
                <header className="panel-v2-header">
                  <div><h2>Expense control</h2><p>Standalone costs recorded outside product fees</p></div>
                </header>
                <div className="finance-callout-v2">
                  <span className="finance-callout-v2-icon"><Icon name="expenses" size={18} /></span>
                  <div><strong>{expenses.length} expense{expenses.length === 1 ? '' : 's'}</strong><span>{money(exp)} recorded</span></div>
                  <button type="button" className="secondary-button" onClick={() => setParams({ view: 'expenses' })}>Open ledger</button>
                </div>
              </section>
            )}

            {settings.features.receiptsEnabled && (
              <section className="panel-v2">
                <header className="panel-v2-header">
                  <div><h2>Receipt inbox</h2><p>Supporting documents ready to review and match</p></div>
                </header>
                <div className="finance-callout-v2">
                  <span className="finance-callout-v2-icon"><Icon name="receipts" size={18} /></span>
                  <div><strong>{receipts.length} file{receipts.length === 1 ? '' : 's'}</strong><span>Images and PDFs stored with this business</span></div>
                  <button type="button" className="secondary-button" onClick={() => setParams({ view: 'receipts' })}>Review receipts</button>
                </div>
              </section>
            )}
          </div>

          <div className="workspace-inline-notice-v2">
            <Icon name="sparkles" size={16} />
            <div>
              <strong>Finance now owns expenses, receipts and tax.</strong>
              <span>Enabled finance tools live here rather than competing as separate top-level destinations.</span>
            </div>
            <button type="button" className="row-action-link" onClick={() => navigate('/analytics')}>Open analytics</button>
          </div>
        </div>
      ) : (
        <div className="workspace-v2-embedded workspace-v2-embedded-finance">
          {view === 'expenses' && settings.features.expensesEnabled && <Expenses />}
          {view === 'receipts' && settings.features.receiptsEnabled && <Receipts />}
          {view === 'tax' && <TaxPlannerV2 />}
        </div>
      )}
    </WorkspaceShell>
  )
}

function FinanceRow({
  label,
  value,
  negative,
  strong,
  accent,
}: {
  label: string
  value: string
  negative?: boolean
  strong?: boolean
  accent?: boolean
}) {
  return (
    <div className={`finance-row-v2 ${strong ? 'strong' : ''} ${accent ? 'accent' : ''}`}>
      <span>{label}</span>
      <strong>{negative ? `−${value}` : value}</strong>
    </div>
  )
}

export default FinanceWorkspace
