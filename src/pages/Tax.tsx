import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useProducts } from '../hooks/useProducts'
import { useSettings } from '../hooks/useSettings'
import { useExpenses } from '../hooks/useExpenses'
import { useCurrency } from '../hooks/useCurrency'
import { useToast } from '../hooks/useToast'
import { productSaleDate } from '../lib/finance'
import {
  calculateIncomeTax,
  calculateClass4Ni,
  getTaxConfig,
  inUkTaxYear,
  ukTaxYearLabel,
  ukTaxYearStartForDate,
} from '../config/tax'
import type { Product } from '../types/product'

const taxCalculationMethods = ['Cash basis', 'Accruals']

function calculateUkTaxLiability(products: Product[], method: 'cash' | 'accruals', businessExpenses: number, yearStart: number) {
  if (method !== 'cash' && method !== 'accruals') {
    throw new Error('Unknown calculation method')
  }

  const config = getTaxConfig(yearStart)

  const soldProducts = products.filter(p => {
    if (p.status !== 'Sold' || p.salePrice === null) return false
    const saleDate = productSaleDate(p)
    if (!saleDate || !inUkTaxYear(new Date(saleDate), yearStart)) return false
    return true
  })

  let taxableProfit = 0

  soldProducts.forEach(product => {
    taxableProfit += product.profit || 0
  })

  taxableProfit = Math.max(0, taxableProfit - businessExpenses)

  const incomeTax = calculateIncomeTax(taxableProfit, config)
  const nationalInsurance = calculateClass4Ni(taxableProfit, config)
  const totalTax = incomeTax + nationalInsurance

  return {
    config,
    taxableProfit,
    incomeTax,
    nationalInsurance,
    totalTax
  }
}

function Tax() {
  const navigate = useNavigate()
  const { products } = useProducts()
  const { settings, updateSettings } = useSettings()
  const { expenses } = useExpenses()
  const { money } = useCurrency()
  const { showToast } = useToast()

  const reservedAmount = settings.tax?.reservedAmount ?? 0
  const filingStatus = settings.tax?.filingStatus ?? 'not-filed'

  const currentYearStart = ukTaxYearStartForDate(new Date())
  const availableTaxYears = [currentYearStart - 1, currentYearStart, currentYearStart + 1]

  const [selectedTaxYear, setSelectedTaxYear] = useState(currentYearStart)
  const [calculationMethod, setCalculationMethod] = useState('cash')
  const [showDetails, setShowDetails] = useState(false)

  const totalExpenses = useMemo(
    () => expenses
      .filter((e) => e.expenseDate && inUkTaxYear(new Date(e.expenseDate), selectedTaxYear))
      .reduce((sum, e) => sum + (e.amount || 0), 0),
    [expenses, selectedTaxYear],
  )

  const taxResults = useMemo(() => {
    return calculateUkTaxLiability(products, calculationMethod as 'cash' | 'accruals', totalExpenses, selectedTaxYear)
  }, [products, calculationMethod, totalExpenses, selectedTaxYear])

  const yearlyRevenue = useMemo(() => {
    return products.reduce((sum, p) => {
      if (p.status === 'Sold' && p.salePrice !== null) {
        const saleDate = productSaleDate(p)
        if (saleDate && inUkTaxYear(new Date(saleDate), selectedTaxYear)) {
          return sum + p.salePrice
        }
      }
      return sum
    }, 0)
  }, [products, selectedTaxYear])

  const recentSales = useMemo(() => {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    return products
      .filter(p => p.status === 'Sold' && p.saleDate)
      .sort((a, b) => new Date(b.saleDate!).getTime() - new Date(a.saleDate!).getTime())
      .slice(0, 6)
  }, [products])

  const quarterlyStats = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1
    const quarters = [
      { label: 'Q1', range: 'Apr-Jun', deadline: '31 Oct', status: 'completed' },
      { label: 'Q2', range: 'Jul-Sep', deadline: '31 Dec', status: currentMonth >= 7 && currentMonth <= 9 ? 'in-progress' : 'upcoming' },
      { label: 'Q3', range: 'Oct-Dec', deadline: '31 Jan', status: currentMonth >= 10 && currentMonth <= 12 ? 'in-progress' : 'upcoming' },
      { label: 'Q4', range: 'Jan-Mar', deadline: '31 Apr', status: currentMonth >= 1 && currentMonth <= 3 ? 'in-progress' : 'upcoming' },
    ]

    return quarters
  }, [])

  const taxTips = [
    {
      icon: '📊',
      title: 'Making Tax Digital',
      content: 'Keep digital records of all sales and expenses. Use HMRC-approved software for tax filing.'
    },
    {
      icon: '📅',
      title: 'Quarterly Deadlines',
      content: `Current quarter (Apr-Jun) is due by 31 Oct ${new Date().getMonth() >= 10 ? new Date().getFullYear() + 1 : new Date().getFullYear()}. Late filing penalties apply.`
    },
    {
      icon: '💰',
      title: 'Expense Deductions',
      content: 'You can deduct business expenses including shipping, advertising, and platform fees from your taxable profit.'
    }
  ]

  return (
    <div className="inventory-page">
      <div className="page-heading">
        <div>
          <h1>Tax Calculator</h1>
          <p>Calculate your UK tax obligations and stay compliant.</p>
        </div>
      </div>

      <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', fontSize: '13px', color: '#78350f' }}>
        These figures are estimates for planning only and are not HMRC-verified advice. Check rates and thresholds for your own tax year and filing basis before submitting a return.
      </div>

      <div className="inventory-stats">
        <div className="inventory-stat inventory-stat-listed">
          <span>Revenue</span>
          <strong>{money(yearlyRevenue)}</strong>
          <span className="stat-label">
            {ukTaxYearLabel(selectedTaxYear)} tax year
          </span>
        </div>

        <div className="inventory-stat">
          <span>Taxable profit</span>
          <strong>{money(taxResults.taxableProfit)}</strong>
          <span className="stat-label">
            After business expenses
          </span>
        </div>

        <div className="inventory-stat">
          <span>Income tax due</span>
          <strong>{money(taxResults.incomeTax)}</strong>
          <span className="stat-label">
            Personal tax liability
          </span>
        </div>

        <div className="inventory-stat">
          <span>National Insurance</span>
          <strong>{money(taxResults.nationalInsurance)}</strong>
          <span className="stat-label">
            Class 2 & Class 4 contributions
          </span>
        </div>

        <div className="inventory-stat" style={{ borderColor: taxResults.totalTax > 0 ? 'var(--shq-loss)' : 'var(--shq-success)', borderWidth: '2px' }}>
          <span>Total tax liability</span>
          <strong>{money(taxResults.totalTax)}</strong>
          <span className={`stat-label ${taxResults.totalTax > 0 ? 'negative' : 'positive'}`}>
            {taxResults.totalTax > 0 ? 'Due payment' : 'No tax due'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Tax reserve</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--shq-ink-muted)' }}>
            Track how much you've set aside to cover your tax bill.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Estimated tax due</span>
              <strong>{money(taxResults.totalTax)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Reserved so far</span>
              <strong style={{ color: 'var(--shq-success)' }}>{money(reservedAmount)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--shq-border)' }}>
              <span>Still to reserve</span>
              <strong style={{ color: Math.max(0, taxResults.totalTax - reservedAmount) > 0 ? 'var(--shq-loss)' : 'var(--shq-success)' }}>
                {money(Math.max(0, taxResults.totalTax - reservedAmount))}
              </strong>
            </div>
            <label style={{ fontSize: '13px', fontWeight: '500' }}>
              Update reserved amount
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={reservedAmount}
              onChange={(e) => {
                const value = Number(e.target.value) || 0
                updateSettings({ tax: { ...settings.tax, reservedAmount: value } })
                  .then(() => showToast('Tax reserve updated', 'success'))
                  .catch(() => showToast('Failed to save tax reserve', 'error'))
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--shq-border)',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'var(--shq-bg)',
                color: 'var(--shq-ink)',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Self Assessment</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--shq-ink-muted)' }}>
            UK Self Assessment deadline: <strong>31 January</strong> following the end of the tax year (5 April).
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Selected tax year</span>
              <strong>{ukTaxYearLabel(selectedTaxYear)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Period</span>
              <strong>6 Apr {selectedTaxYear} – 5 Apr {selectedTaxYear + 1}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Filing deadline</span>
              <strong>31 Jan {selectedTaxYear + 1}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--shq-border)' }}>
              <span>Filing status</span>
              <select
                value={filingStatus}
                onChange={(e) => {
                  updateSettings({ tax: { ...settings.tax, filingStatus: e.target.value as 'not-filed' | 'filed' } })
                    .then(() => showToast('Filing status updated', 'success'))
                    .catch(() => showToast('Failed to save filing status', 'error'))
                }}
                style={{
                  padding: '6px 10px',
                  border: '1px solid var(--shq-border)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  background: 'var(--shq-bg)',
                  color: 'var(--shq-ink)',
                }}
              >
                <option value="not-filed">Not filed</option>
                <option value="filed">Filed</option>
              </select>
            </div>
            {filingStatus === 'filed' && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid var(--shq-success)', color: '#065f46', fontSize: '13px' }}>
                ✓ Self Assessment filed for this tax year
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--shq-ink)' }}>
              Tax year
            </label>
            <select
              value={selectedTaxYear}
              onChange={(e) => setSelectedTaxYear(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #dfe2e6',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'var(--shq-surface)'
              }}
            >
              {availableTaxYears.map((year) => (
                <option key={year} value={year}>
                  {ukTaxYearLabel(year)}{year === currentYearStart ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--shq-ink)' }}>
              Calculation method
            </label>
            <select
              value={calculationMethod}
              onChange={(e) => setCalculationMethod(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #dfe2e6',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'var(--shq-surface)'
              }}
            >
              {taxCalculationMethods.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div data-mobile-hide style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
            Recent sales
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentSales.length > 0 ? (
              recentSales.map((sale) => (
                <div key={sale.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  border: '1px solid #f1f2f4',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {sale.code}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>
                        {sale.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--shq-ink-muted)' }}>
                        Sold on {new Date(sale.saleDate!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--shq-success)' }}>
                      {money(sale.profit || 0)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--shq-ink-muted)' }}>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                  No sales records
                </div>
                <div style={{ fontSize: '12px' }}>
                  Complete some sales to track tax obligations
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
            Quarterly deadlines
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {quarterlyStats.map((quarter, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                border: `1px solid ${quarter.status === 'completed' ? '#d1fae5' :
                                       quarter.status === 'in-progress' ? '#fed7aa' :
                                       '#e5e7eb'}`,
                borderRadius: '8px',
                background: quarter.status === 'completed' ? '#f0fdf4' :
                           quarter.status === 'in-progress' ? '#fffbeb' :
                           '#f9fafb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: quarter.status === 'completed' ? 'var(--shq-success)' :
                               quarter.status === 'in-progress' ? '#f59e0b' :
                               '#d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--shq-surface)'
                  }}>
                    {quarter.label}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>
                      {quarter.range}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--shq-ink-muted)' }}>
                      {quarter.deadline}
                    </div>
                  </div>
                </div>
                <div>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '600',
                    background: quarter.status === 'completed' ? '#d1fae5' :
                               quarter.status === 'in-progress' ? '#fed7aa' :
                               '#f3f4f6',
                    color: quarter.status === 'completed' ? '#065f46' :
                           quarter.status === 'in-progress' ? '#92400e' :
                           '#6b7280'
                  }}>
                    {quarter.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#92400e' }}>
          📝 Tax filing reminders
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {taxTips.map((tip, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ fontSize: '20px' }}>{tip.icon}</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                  {tip.title}
                </div>
                <div style={{ fontSize: '12px', color: '#78350f' }}>
                  {tip.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          type="button"
          className="primary-button"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide' : 'Show'} detailed breakdown
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate('/inventory')}
        >
          Manage inventory
        </button>
      </div>

      {showDetails && (
        <div style={{ marginTop: '24px', background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
            Detailed tax breakdown
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'var(--shq-surface)', borderRadius: '8px', border: '1px solid var(--shq-border)' }}>
              <div style={{ fontSize: '13px', color: 'var(--shq-ink-muted)', marginBottom: '8px' }}>Gross sales revenue</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--shq-ink)' }}>{money(yearlyRevenue)}</div>
            </div>
            <div style={{ padding: '16px', background: 'var(--shq-surface)', borderRadius: '8px', border: '1px solid var(--shq-border)' }}>
              <div style={{ fontSize: '13px', color: 'var(--shq-ink-muted)', marginBottom: '8px' }}>Business expenses</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--shq-ink)' }}>{money(yearlyRevenue - taxResults.taxableProfit)}</div>
            </div>
            <div style={{ padding: '16px', background: 'var(--shq-surface)', borderRadius: '8px', border: '1px solid var(--shq-border)' }}>
              <div style={{ fontSize: '13px', color: 'var(--shq-ink-muted)', marginBottom: '8px' }}>Personal allowance used</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#3b82f6' }}>{money(Math.min(taxResults.taxableProfit, taxResults.config.personalAllowance))}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tax
