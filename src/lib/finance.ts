import type { Product } from '../types/product'
import type { Expense } from '../types/expense'
import {
  TAX_CONFIG,
  calculateIncomeTax,
  calculateClass4Ni,
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

export function soldInPeriod(products: Product[], range: PeriodRange): Product[] {
  return products.filter((p) => {
    if (p.status !== 'Sold' || p.salePrice === null) return false
    const dateString = p.saleDate || p.updatedAt || p.createdAt
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

export function revenue(sold: Product[]): number {
  return sold.reduce((sum, p) => sum + (p.salePrice || 0), 0)
}

export function costOfGoods(sold: Product[]): number {
  return sold.reduce(
    (sum, p) => sum + (p.purchasePrice || 0) + (p.additionalCosts || 0),
    0,
  )
}

export function totalFees(sold: Product[]): number {
  return sold.reduce((sum, p) => {
    const componentSum =
      (p.shippingCost || 0) + (p.platformFees || 0) + (p.otherFees || 0)
    const fees = p.fees || 0
    return sum + fees + Math.max(0, componentSum - fees)
  }, 0)
}

export function grossProfit(sold: Product[]): number {
  return sold.reduce((sum, p) => sum + (p.profit || 0), 0)
}

export function expenseTotal(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
}

export function netProfit(sold: Product[], expenses: Expense[]): number {
  return grossProfit(sold) - expenseTotal(expenses)
}

export function profitMargin(rev: number, prof: number): number {
  return rev > 0 ? (prof / rev) * 100 : 0
}

export function averageSaleValue(sold: Product[]): number {
  return sold.length > 0 ? revenue(sold) / sold.length : 0
}

export function averageProfitPerItem(sold: Product[]): number {
  return sold.length > 0 ? grossProfit(sold) / sold.length : 0
}

export function sellThroughRate(products: Product[]): number {
  const total = products.length
  const sold = products.filter((p) => p.status === 'Sold').length
  return total > 0 ? (sold / total) * 100 : 0
}

export function inventoryCapitalTiedUp(products: Product[]): number {
  return products
    .filter((p) => p.status !== 'Sold')
    .reduce(
      (sum, p) => sum + (p.purchasePrice || 0) + (p.additionalCosts || 0),
      0,
    )
}

export function potentialRevenue(products: Product[]): number {
  return products
    .filter((p) => p.status !== 'Sold')
    .reduce((sum, p) => sum + (p.listingPrice || 0), 0)
}

export function potentialGrossProfit(products: Product[]): number {
  const unsold = products.filter((p) => p.status !== 'Sold')
  const potRev = unsold.reduce((sum, p) => sum + (p.listingPrice || 0), 0)
  const capital = unsold.reduce(
    (sum, p) => sum + (p.purchasePrice || 0) + (p.additionalCosts || 0),
    0,
  )
  return potRev - capital
}

export type AgeingBuckets = {
  bucket: string
  count: number
  value: number
}[]

export function stockAgeingBuckets(products: Product[]): AgeingBuckets {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const unsold = products.filter((p) => p.status !== 'Sold')
  const ranges: { max: number; label: string }[] = [
    { max: 30, label: '0–30 days' },
    { max: 60, label: '31–60 days' },
    { max: 90, label: '61–90 days' },
    { max: Infinity, label: '90+ days' },
  ]
  return ranges.map((b) => {
    const items = unsold.filter((p) => {
      const added = p.dateAdded || p.createdAt
      const age = (now - new Date(added).getTime()) / day
      const lower = b.label === '0–30 days' ? 0 : parseInt(b.label, 10)
      return age >= lower && age <= b.max
    })
    return {
      bucket: b.label,
      count: items.length,
      value: items.reduce(
        (sum, p) => sum + (p.purchasePrice || 0) + (p.additionalCosts || 0),
        0,
      ),
    }
  })
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

export function taxEstimate(netProfitAmount: number): {
  taxableProfit: number
  incomeTax: number
  ni: number
  totalTax: number
} {
  const taxableProfit = Math.max(
    0,
    netProfitAmount - TAX_CONFIG.personalAllowance,
  )
  const incomeTax = calculateIncomeTax(taxableProfit)
  const ni = calculateClass4Ni(taxableProfit)
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
    const dateString = p.saleDate || p.updatedAt || p.createdAt
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
