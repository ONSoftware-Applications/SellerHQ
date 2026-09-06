import { useEffect, useMemo, useState } from 'react'

import Icon from '../components/Icon'
import { useCurrency } from '../hooks/useCurrency'
import { useExpenses } from '../hooks/useExpenses'
import { useProducts } from '../hooks/useProducts'
import { useSettings } from '../hooks/useSettings'
import { useSubscription } from '../hooks/useSubscription'
import { useToast } from '../hooks/useToast'
import {
  TAX_YEARS,
  calculateClass4Ni,
  calculateIncomeTax,
  getTaxConfig,
  inUkTaxYear,
  ukTaxYearLabel,
  ukTaxYearStartForDate,
} from '../config/tax'
import { productSaleDate } from '../lib/finance'

function TaxPlannerV2() {
  const { products } = useProducts()
  const { expenses } = useExpenses()
  const { settings, updateSettings } = useSettings()
  const { canUse } = useSubscription()
  const { money } = useCurrency()
  const { showToast } = useToast()

  const currentYearStart = ukTaxYearStartForDate(new Date())
  const supportedYears = Object.keys(TAX_YEARS).map(Number).sort((a, b) => b - a)
  const initialYear = supportedYears.includes(currentYearStart)
    ? currentYearStart
    : supportedYears[0]
  const [selectedTaxYear, setSelectedTaxYear] = useState(initialYear)
  const [reserveInput, setReserveInput] = useState(String(settings.tax?.reservedAmount ?? 0))

  useEffect(() => {
    setReserveInput(String(settings.tax?.reservedAmount ?? 0))
  }, [settings.tax?.reservedAmount])

  const data = useMemo(() => {
    const config = getTaxConfig(selectedTaxYear)
    const sold = products.filter((product) => {
      if (product.status !== 'Sold' || product.salePrice === null) return false
      const date = productSaleDate(product)
      return Boolean(date && inUkTaxYear(new Date(date), selectedTaxYear))
    })
    const periodExpenses = expenses.filter((expense) =>
      Boolean(expense.expenseDate && inUkTaxYear(new Date(expense.expenseDate), selectedTaxYear)),
    )

    const revenue = sold.reduce((sum, product) => sum + (product.salePrice || 0), 0)
    const grossProfit = sold.reduce((sum, product) => sum + (product.profit || 0), 0)
    const operatingExpenses = periodExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    const profitAfterExpenses = Math.max(0, grossProfit - operatingExpenses)
    const incomeTax = calculateIncomeTax(profitAfterExpenses, config)
    const class4Ni = calculateClass4Ni(profitAfterExpenses, config)
    const totalEstimate = incomeTax + class4Ni

    return {
      config,
      sold,
      revenue,
      grossProfit,
      operatingExpenses,
      profitAfterExpenses,
      incomeTax,
      class4Ni,
      totalEstimate,
    }
  }, [expenses, products, selectedTaxYear])

  const reserved = settings.tax?.reservedAmount ?? 0
  const remaining = Math.max(0, data.totalEstimate - reserved)
  const reserveCoverage = data.totalEstimate > 0
    ? Math.min(100, (reserved / data.totalEstimate) * 100)
    : 100
  const fullTax = canUse('fullTax')

  async function saveReserve() {
    const value = Math.max(0, Number(reserveInput) || 0)
    await updateSettings({ tax: { ...settings.tax, reservedAmount: value } })
    showToast('Tax reserve updated', 'success')
  }

  async function setFilingStatus(value: 'not-filed' | 'filed') {
    await updateSettings({ tax: { ...settings.tax, filingStatus: value } })
    showToast('Filing status updated', 'success')
  }

  return (
    <div className="tax-planner-v2">
      <div className="tax-disclaimer-v2">
        <Icon name="alert" size={16} />
        <div>
          <strong>Planning estimate only</strong>
          <span>SellerHQ uses the tax configuration stored for the selected year. It is not tax advice or a substitute for checking your own filing position.</span>
        </div>
      </div>

      <div className="tax-toolbar-v2">
        <label>
          <span>Tax year</span>
          <select value={selectedTaxYear} onChange={(event) => setSelectedTaxYear(Number(event.target.value))}>
            {supportedYears.map((year) => (
              <option key={year} value={year}>
                {ukTaxYearLabel(year)}{year === currentYearStart ? ' · current' : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="tax-period-v2">
          <span>Period</span>
          <strong>6 Apr {selectedTaxYear} – 5 Apr {selectedTaxYear + 1}</strong>
        </div>
      </div>

      <div className="workspace-metric-strip workspace-metric-strip-4">
        <div><span>Revenue</span><strong>{money(data.revenue)}</strong></div>
        <div><span>Profit after expenses</span><strong>{money(data.profitAfterExpenses)}</strong></div>
        <div><span>Estimated tax & NI</span><strong>{money(data.totalEstimate)}</strong></div>
        <div><span>Still to reserve</span><strong className={remaining > 0 ? 'negative' : 'positive'}>{money(remaining)}</strong></div>
      </div>

      <div className="tax-grid-v2">
        <section className="panel-v2">
          <header className="panel-v2-header">
            <div><h2>Tax reserve</h2><p>Track cash you have set aside against the current planning estimate.</p></div>
          </header>
          <div className="reserve-v2">
            <div className="reserve-v2-head">
              <div><span>Estimated liability</span><strong>{money(data.totalEstimate)}</strong></div>
              <div><span>Reserved</span><strong>{money(reserved)}</strong></div>
            </div>
            <div className="reserve-v2-track"><span style={{ width: `${reserveCoverage}%` }} /></div>
            <p>{remaining > 0 ? `${money(remaining)} remains uncovered by your recorded reserve.` : 'Your recorded reserve currently covers this estimate.'}</p>
          </div>
          <div className="tax-reserve-editor-v2">
            <label>
              <span>Reserved amount</span>
              <input type="number" min="0" step="1" value={reserveInput} onChange={(event) => setReserveInput(event.target.value)} />
            </label>
            <button type="button" className="secondary-button" onClick={() => void saveReserve()}>Save reserve</button>
          </div>
        </section>

        <section className="panel-v2">
          <header className="panel-v2-header">
            <div><h2>Self Assessment status</h2><p>Personal tracking for the selected SellerHQ tax year.</p></div>
          </header>
          <div className="tax-status-card-v2">
            <div>
              <span>Selected tax year</span>
              <strong>{ukTaxYearLabel(selectedTaxYear)}</strong>
            </div>
            <label>
              <span>Filing status</span>
              <select
                value={settings.tax?.filingStatus ?? 'not-filed'}
                onChange={(event) => void setFilingStatus(event.target.value as 'not-filed' | 'filed')}
              >
                <option value="not-filed">Not marked as filed</option>
                <option value="filed">Marked as filed</option>
              </select>
            </label>
            <div className={`tax-filing-state-v2 ${(settings.tax?.filingStatus ?? 'not-filed') === 'filed' ? 'filed' : ''}`}>
              <Icon name={(settings.tax?.filingStatus ?? 'not-filed') === 'filed' ? 'check' : 'clock'} size={15} />
              <span>{(settings.tax?.filingStatus ?? 'not-filed') === 'filed' ? 'You marked this return as filed.' : 'SellerHQ has not recorded this return as filed.'}</span>
            </div>
          </div>
        </section>

        <section className="panel-v2 tax-breakdown-v2">
          <header className="panel-v2-header">
            <div><h2>Estimate breakdown</h2><p>How the recorded SellerHQ figures feed into this planning estimate.</p></div>
          </header>
          <div className="finance-ledger-v2">
            <TaxRow label="Sales revenue" value={money(data.revenue)} />
            <TaxRow label="Recorded product profit" value={money(data.grossProfit)} />
            <TaxRow label="Operating expenses" value={`−${money(data.operatingExpenses)}`} />
            <TaxRow label="Profit used for estimate" value={money(data.profitAfterExpenses)} strong />
            {fullTax ? (
              <>
                <TaxRow label="Income tax estimate" value={money(data.incomeTax)} />
                <TaxRow label="Class 4 National Insurance estimate" value={money(data.class4Ni)} />
              </>
            ) : (
              <div className="tax-upgrade-note-v2">
                Detailed income-tax and National Insurance components are available on Pro and Business plans.
              </div>
            )}
            <TaxRow label="Total planning estimate" value={money(data.totalEstimate)} strong accent />
          </div>
        </section>

        <section className="panel-v2 tax-basis-v2">
          <header className="panel-v2-header">
            <div><h2>Calculation basis</h2><p>Configuration currently used by SellerHQ for {ukTaxYearLabel(selectedTaxYear)}.</p></div>
          </header>
          <div className="tax-config-grid-v2">
            <div><span>Personal allowance</span><strong>{money(data.config.personalAllowance)}</strong></div>
            <div><span>Basic rate</span><strong>{(data.config.basicRate * 100).toFixed(0)}%</strong></div>
            <div><span>Higher rate</span><strong>{(data.config.higherRate * 100).toFixed(0)}%</strong></div>
            <div><span>Class 4 main rate</span><strong>{(data.config.niLowerRate * 100).toFixed(0)}%</strong></div>
          </div>
          <p className="tax-basis-note-v2">The app's simplified estimate may not account for every allowance, relief, other income source or individual circumstance.</p>
        </section>
      </div>
    </div>
  )
}

function TaxRow({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className={`finance-row-v2 ${strong ? 'strong' : ''} ${accent ? 'accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default TaxPlannerV2
