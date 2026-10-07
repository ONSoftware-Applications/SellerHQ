import type { Product } from '../types/product'
import type { Expense } from '../types/expense'
import type { Sale } from '../types/sale'
import {
  TAX_CONFIG,
  calculateIncomeTax,
  calculateClass4Ni,
  type TaxYearConfig,
} from '../config/tax'

export type Period = 'today' | 'week' | 'month' | 'year' | 'all'

export type PeriodRange = { start: Date; end: Date; label: string }

export function periodRange(period: Period): PeriodRange {
  const now = new Date()
  const end = new Date(now)
  let start = new Date(now)

  switch (period) {
    case 'today': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return { start, end, label: 'Today' }
    }
    case 'week': {
      start = new Date(now)
      start.setDate(now.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      return { start, end, label: 'Last 7 days' }
    }
    case 'month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start, end, label: 'This month' }
    }
    case 'year': {
      start = new Date(now.getFullYear(), 0, 1)
      return { start, end, label: 'This year' }
    }
    default:
      start = new Date(0)
      return { start, end, label: 'All time' }
  }
}

export function productSaleDate(product: Product): string | null {
  return product.saleDate || product.updatedAt || product.createdAt || null
}

export function saleRecordDate(sale: Sale): string | null {
  return sale.saleDate || sale.updatedAt || sale.createdAt || null
}

export function soldInPeriod(products: Product[], range: PeriodRange): Product[] {
  return products.filter((p) => {
    if (p.status !== 'Sold' || p.salePrice === null) return false
    const dateString = productSaleDate(p)
    if (!dateString) return false
    const d = new Date(dateString)
    return d >= range.start && d <= range.end
  })
}

export function salesInPeriod(sales: Sale[], range: PeriodRange): Sale[] {
  return sales.filter((sale) => {
    if (sale.refunded || sale.status === 'Refunded' || sale.status === 'Voided') {
      return false
    }
    const dateString = saleRecordDate(sale)
    if (!dateString) return false
    const d = new Date(dateString)
    return d >= range.start && d <= range.end
  })
}

export function expensesInPeriod(expenses: Expense[], range: PeriodRange): Expense[] {
  return expenses.filter((e) => {
    if (!e.expenseDate) return false
    const d = new Date(e.expenseDate)
    return d >= range.start && d <= range.end
  })
}

type FinancialSale = Product | Sale

function financialSalePrice(item: FinancialSale): number {
  return item.salePrice ?? 0
}

function financialSaleProfit(item: FinancialSale): number {
  return item.profit ?? 0
}

function financialSaleDate(item: FinancialSale): string | null {
  if ('productName' in item) return saleRecordDate(item)
  return productSaleDate(item)
}

export function revenue(sold: FinancialSale[]): number {
  return sold.reduce((sum, item) => sum + financialSalePrice(item), 0)
}

export function costOfGoods(sold: FinancialSale[]): number {
  return sold.reduce((sum, item) => {
    if ('costOfGoods' in item) {
      return sum + (item.costOfGoods || 0)
    }
    return sum + (item.purchasePrice || 0) + (item.additionalCosts || 0)
  }, 0)
}

export function totalFees(sold: FinancialSale[]): number {
  return sold.reduce((sum, item) => {
    const componentSum =
      (item.shippingCost || 0)
      + (item.platformFees || 0)
      + (item.otherFees || 0)
    const fees = item.fees || 0
    return sum + fees + Math.max(0, componentSum - fees)
  }, 0)
}

export function grossProfit(sold: FinancialSale[]): number {
  return sold.reduce((sum, item) => sum + financialSaleProfit(item), 0)
}

export function expenseTotal(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
}

export function netProfit(sold: FinancialSale[], expenses: Expense[]): number {
  return grossProfit(sold) - expenseTotal(expenses)
}

export function profitMargin(rev: number, prof: number): number {
  return rev > 0 ? (prof / rev) * 100 : 0
}

export function averageSaleValue(sold: FinancialSale[]): number {
  return sold.length > 0 ? revenue(sold) / sold.length : 0
}

export function averageProfitPerItem(sold: FinancialSale[]): number {
  const units = sold.reduce(
    (sum, item) => sum + ('quantity' in item ? Math.max(1, item.quantity || 1) : 1),
    0,
  )
  return units > 0 ? grossProfit(sold) / units : 0
}

export function sellThroughRate(products: Product[], sales: Sale[] = []): number {
  if (sales.length > 0) {
    const soldUnits = sales
      .filter((sale) => !sale.refunded && sale.status !== 'Refunded' && sale.status !== 'Voided')
      .reduce((sum, sale) => sum + Math.max(0, sale.quantity), 0)
    const currentUnits = products.reduce(
      (sum, product) => sum + Math.max(0, product.quantity || 0),
      0,
    )
    const totalUnits = soldUnits + currentUnits
    return totalUnits > 0 ? (soldUnits / totalUnits) * 100 : 0
  }

  const total = products.length
  const sold = products.filter((p) => p.status === 'Sold').length
  return total > 0 ? (sold / total) * 100 : 0
}

export function inventoryCapitalTiedUp(products: Product[]): number {
  return products
    .filter((product) => product.quantity > 0 && product.status !== 'Archived')
    .reduce(
      (sum, product) =>
        sum
        + ((product.purchasePrice || 0) + (product.additionalCosts || 0))
          * Math.max(0, product.quantity || 0),
      0,
    )
}

export function potentialRevenue(products: Product[]): number {
  return products
    .filter((product) => product.quantity > 0 && product.status !== 'Archived')
    .reduce(
      (sum, product) =>
        sum + (product.listingPrice || 0) * Math.max(0, product.quantity || 0),
      0,
    )
}

export function potentialGrossProfit(products: Product[]): number {
  return potentialRevenue(products) - inventoryCapitalTiedUp(products)
}

export type AgeingBuckets = {
  bucket: string
  count: number
  value: number
}[]

export function stockAgeingBuckets(products: Product[]): AgeingBuckets {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const unsold = products.filter(
    (product) => product.quantity > 0 && product.status !== 'Archived',
  )
  const ranges: { max: number; label: string }[] = [
    { max: 30, label: '0–30 days' },
    { max: 60, label: '31–60 days' },
    { max: 90, label: '61–90 days' },
    { max: Infinity, label: '90+ days' },
  ]
  return ranges.map((bucket) => {
    const items = unsold.filter((product) => {
      const added = product.dateAdded || product.createdAt
      const age = (now - new Date(added).getTime()) / day
      const lower =
        bucket.label === '0–30 days'
          ? 0
          : parseInt(bucket.label, 10)
      return age >= lower && age <= bucket.max
    })

    return {
      bucket: bucket.label,
      count: items.reduce(
        (sum, product) => sum + Math.max(0, product.quantity || 0),
        0,
      ),
      value: items.reduce(
        (sum, product) =>
          sum
          + ((product.purchasePrice || 0) + (product.additionalCosts || 0))
            * Math.max(0, product.quantity || 0),
        0,
      ),
    }
  })
}

export function groupByMarketplace(
  sold: FinancialSale[],
): { marketplace: string; revenue: number; profit: number; count: number }[] {
  const map = new Map<string, { revenue: number; profit: number; count: number }>()
  for (const item of sold) {
    const key = item.saleMarketplace || 'Unknown'
    const existing = map.get(key) || { revenue: 0, profit: 0, count: 0 }
    existing.revenue += financialSalePrice(item)
    existing.profit += financialSaleProfit(item)
    existing.count += 'productName' in item ? Math.max(1, item.quantity) : 1
    map.set(key, existing)
  }
  return Array.from(map.entries()).map(([marketplace, value]) => ({
    marketplace,
    ...value,
  }))
}

export function groupByMonth(
  sold: FinancialSale[],
): { month: string; revenue: number; profit: number }[] {
  const map = new Map<string, { revenue: number; profit: number }>()
  for (const item of sold) {
    const dateString = financialSaleDate(item)
    if (!dateString) continue
    const date = new Date(dateString)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const existing = map.get(key) || { revenue: 0, profit: 0 }
    existing.revenue += financialSalePrice(item)
    existing.profit += financialSaleProfit(item)
    map.set(key, existing)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month, ...value }))
}

export function bestPerforming(
  sold: FinancialSale[],
  field: 'brand' | 'category',
): { name: string; revenue: number; profit: number; count: number }[] {
  const map = new Map<string, { revenue: number; profit: number; count: number }>()
  for (const item of sold) {
    const key = (item[field] || 'Unknown').trim() || 'Unknown'
    const existing = map.get(key) || { revenue: 0, profit: 0, count: 0 }
    existing.revenue += financialSalePrice(item)
    existing.profit += financialSaleProfit(item)
    existing.count += 'productName' in item ? Math.max(1, item.quantity) : 1
    map.set(key, existing)
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.profit - a.profit)
}

export type Alert = {
  id: string
  level: 'red' | 'orange' | 'yellow' | 'green'
  message: string
}

export function needsAttention(
  products: Product[],
  expenses: Expense[],
): Alert[] {
  const alerts: Alert[] = []
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  const relist = products.filter(
    (p) => p.status === 'Listed' && p.listingDate,
  ).filter((p) => {
    const age = (now - new Date(p.listingDate as string).getTime()) / day
    return age > 30
  })
  if (relist.length > 0) {
    alerts.push({
      id: 'relist',
      level: 'red',
      message: `${relist.length} product${relist.length > 1 ? 's' : ''} need relisting`,
    })
  }

  const stale = products.filter((p) => {
    if (p.status === 'Sold') return false
    const added = p.dateAdded || p.createdAt
    const age = (now - new Date(added).getTime()) / day
    return age >= 60
  })
  if (stale.length > 0) {
    alerts.push({
      id: 'stale',
      level: 'orange',
      message: `${stale.length} product${stale.length > 1 ? 's have' : ' has'} been in inventory 60+ days`,
    })
  }

  const uncategorised = expenses.filter(
    (e) => !e.category || e.category === 'Other',
  )
  if (uncategorised.length > 0) {
    alerts.push({
      id: 'uncategorised',
      level: 'yellow',
      message: `${uncategorised.length} expense${uncategorised.length > 1 ? 's' : ''} categorised as Other`,
    })
  }

  return alerts
}

export function taxEstimate(
  netProfitAmount: number,
  config: TaxYearConfig = TAX_CONFIG,
): {
  taxableProfit: number
  incomeTax: number
  ni: number
  totalTax: number
} {
  const taxableProfit = Math.max(0, netProfitAmount)
  const incomeTax = calculateIncomeTax(taxableProfit, config)
  const ni = calculateClass4Ni(taxableProfit, config)
  return {
    taxableProfit,
    incomeTax,
    ni,
    totalTax: incomeTax + ni,
  }
}

export function groupByMarketplace(
  sold: Product[],
): { marketplace: string; revenue: number; profit: number; count: number }[] {
  const map = new Map<string, { revenue: number; profit: number; count: number }>()
  for (const p of sold) {
    const key = p.saleMarketplace || 'Unknown'
    const existing = map.get(key) || { revenue: 0, profit: 0, count: 0 }
    existing.revenue += p.salePrice || 0
    existing.profit += p.profit || 0
    existing.count += 1
    map.set(key, existing)
  }
  return Array.from(map.entries()).map(([marketplace, v]) => ({
    marketplace,
    ...v,
  }))
}

export function groupByMonth(
  sold: Product[],
): { month: string; revenue: number; profit: number }[] {
  const map = new Map<string, { revenue: number; profit: number }>()
  for (const p of sold) {
    const dateString = productSaleDate(p)
    if (!dateString) continue
    const d = new Date(dateString)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const existing = map.get(key) || { revenue: 0, profit: 0 }
    existing.revenue += p.salePrice || 0
    existing.profit += p.profit || 0
    map.set(key, existing)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }))
}

export function bestPerforming(
  sold: Product[],
  field: 'brand' | 'category',
): { name: string; revenue: number; profit: number; count: number }[] {
  const map = new Map<string, { revenue: number; profit: number; count: number }>()
  for (const p of sold) {
    const key = (p[field] || 'Unknown').trim() || 'Unknown'
    const existing = map.get(key) || { revenue: 0, profit: 0, count: 0 }
    existing.revenue += p.salePrice || 0
    existing.profit += p.profit || 0
    existing.count += 1
    map.set(key, existing)
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.profit - a.profit)
}
