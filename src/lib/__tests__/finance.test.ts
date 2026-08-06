import { describe, expect, it } from 'vitest'
import {
  periodRange,
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
  inventoryCapitalTiedUp,
  potentialRevenue,
  potentialGrossProfit,
  stockAgeingBuckets,
  needsAttention,
  taxEstimate,
  groupByMarketplace,
  groupByMonth,
  bestPerforming,
} from '../finance'
import type { Product } from '../../types/product'
import type { Expense } from '../../types/expense'

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: '1',
    businessId: 'b1',
    code: 'TEST-001',
    sku: '',
    name: 'Test product',
    description: '',
    brand: 'Brand A',
    category: 'Clothing',
    size: '',
    colour: '',
    condition: 'New',
    purchasePrice: 10,
    purchaseDate: null,
    purchaseSource: '',
    quantity: 1,
    reorderLevel: 0,
    storageLocation: '',
    barcode: '',
    photos: [],
    labels: [],
    status: 'Unlisted',
    marketplaces: [],
    listingPrice: 0,
    listingDate: null,
    salePrice: null,
    saleDate: null,
    shippingDate: null,
    fees: 0,
    profit: 0,
    additionalCosts: 0,
    saleMarketplace: null,
    shippingCost: 0,
    platformFees: 0,
    otherFees: 0,
    refunded: false,
    refundAmount: 0,
    refundDate: null,
    refundNote: '',
    dateAdded: '2025-01-01',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...overrides,
  }
}

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: '1',
    businessId: 'b1',
    amount: 50,
    category: 'Shipping',
    description: 'Test expense',
    expenseDate: '2025-06-15',
    marketplace: '',
    supplier: '',
    paymentMethod: '',
    notes: '',
    createdAt: '2025-06-15',
    updatedAt: '2025-06-15',
    ...overrides,
  }
}

describe('periodRange', () => {
  it('returns correct range for today', () => {
    const range = periodRange('today')
    expect(range.start.getDate()).toBe(new Date().getDate())
    expect(range.end.getTime()).toBeGreaterThanOrEqual(range.start.getTime())
  })

  it('returns correct range for week', () => {
    const range = periodRange('week')
    const diffMs = range.end.getTime() - range.start.getTime()
    const diffDays = diffMs / (24 * 60 * 60 * 1000)
    expect(diffDays).toBeGreaterThanOrEqual(6)
    expect(diffDays).toBeLessThanOrEqual(7)
  })

  it('returns correct range for month', () => {
    const range = periodRange('month')
    expect(range.start.getDate()).toBe(1)
  })

  it('returns correct range for year', () => {
    const range = periodRange('year')
    expect(range.start.getMonth()).toBe(0)
    expect(range.start.getDate()).toBe(1)
  })

  it('returns correct range for all time', () => {
    const range = periodRange('all')
    expect(range.start.getFullYear()).toBe(1970)
  })
})

describe('revenue', () => {
  it('sums sale prices', () => {
    const products = [
      makeProduct({ salePrice: 100, status: 'Sold' }),
      makeProduct({ id: '2', salePrice: 200, status: 'Sold' }),
    ]
    expect(revenue(products)).toBe(300)
  })

  it('returns 0 for empty array', () => {
    expect(revenue([])).toBe(0)
  })
})

describe('costOfGoods', () => {
  it('sums purchase price and additional costs', () => {
    const products = [
      makeProduct({ purchasePrice: 10, additionalCosts: 5, status: 'Sold' }),
      makeProduct({ id: '2', purchasePrice: 20, additionalCosts: 0, status: 'Sold' }),
    ]
    expect(costOfGoods(products)).toBe(35)
  })
})

describe('totalFees', () => {
  it('uses the stored fees total without double counting', () => {
    const products = [
      makeProduct({ fees: 5, shippingCost: 3, otherFees: 2, status: 'Sold' }),
    ]
    expect(totalFees(products)).toBe(5)
  })

  it('falls back to fee components when fees is not set', () => {
    const products = [
      makeProduct({ fees: 0, shippingCost: 3, platformFees: 4, otherFees: 2, status: 'Sold' }),
    ]
    expect(totalFees(products)).toBe(9)
  })
})

describe('grossProfit', () => {
  it('sums profit fields', () => {
    const products = [
      makeProduct({ profit: 50, status: 'Sold' }),
      makeProduct({ id: '2', profit: -10, status: 'Sold' }),
    ]
    expect(grossProfit(products)).toBe(40)
  })
})

describe('expenseTotal', () => {
  it('sums expense amounts', () => {
    const expenses = [
      makeExpense({ amount: 100 }),
      makeExpense({ id: '2', amount: 50 }),
    ]
    expect(expenseTotal(expenses)).toBe(150)
  })
})

describe('netProfit', () => {
  it('subtracts expenses from gross profit', () => {
    const products = [makeProduct({ profit: 200, status: 'Sold' })]
    const expenses = [makeExpense({ amount: 50 })]
    expect(netProfit(products, expenses)).toBe(150)
  })
})

describe('profitMargin', () => {
  it('calculates percentage', () => {
    expect(profitMargin(200, 50)).toBe(25)
  })

  it('returns 0 when revenue is 0', () => {
    expect(profitMargin(0, 50)).toBe(0)
  })
})

describe('averageSaleValue', () => {
  it('calculates average', () => {
    const products = [
      makeProduct({ salePrice: 100, status: 'Sold' }),
      makeProduct({ id: '2', salePrice: 200, status: 'Sold' }),
    ]
    expect(averageSaleValue(products)).toBe(150)
  })

  it('returns 0 for empty', () => {
    expect(averageSaleValue([])).toBe(0)
  })
})

describe('averageProfitPerItem', () => {
  it('calculates average', () => {
    const products = [
      makeProduct({ profit: 30, status: 'Sold' }),
      makeProduct({ id: '2', profit: 70, status: 'Sold' }),
    ]
    expect(averageProfitPerItem(products)).toBe(50)
  })
})

describe('sellThroughRate', () => {
  it('calculates percentage of sold items', () => {
    const products = [
      makeProduct({ status: 'Sold' }),
      makeProduct({ id: '2', status: 'Listed' }),
      makeProduct({ id: '3', status: 'Sold' }),
    ]
    expect(sellThroughRate(products)).toBeCloseTo(66.67, 1)
  })

  it('returns 0 for empty', () => {
    expect(sellThroughRate([])).toBe(0)
  })
})

describe('inventoryCapitalTiedUp', () => {
  it('sums costs of unsold products', () => {
    const products = [
      makeProduct({ purchasePrice: 10, additionalCosts: 5, status: 'Listed' }),
      makeProduct({ id: '2', purchasePrice: 20, status: 'Sold' }),
    ]
    expect(inventoryCapitalTiedUp(products)).toBe(15)
  })
})

describe('potentialRevenue', () => {
  it('sums listing prices of unsold products', () => {
    const products = [
      makeProduct({ listingPrice: 100, status: 'Listed' }),
      makeProduct({ id: '2', listingPrice: 200, status: 'Sold' }),
    ]
    expect(potentialRevenue(products)).toBe(100)
  })
})

describe('potentialGrossProfit', () => {
  it('calculates potential profit from unsold stock', () => {
    const products = [
      makeProduct({ listingPrice: 100, purchasePrice: 30, additionalCosts: 10, status: 'Listed' }),
    ]
    expect(potentialGrossProfit(products)).toBe(60)
  })
})

describe('stockAgeingBuckets', () => {
  it('returns four buckets', () => {
    const buckets = stockAgeingBuckets([])
    expect(buckets).toHaveLength(4)
  })

  it('categorises products by age', () => {
    const now = new Date()
    const recent = new Date(now)
    recent.setDate(recent.getDate() - 10)
    const old = new Date(now)
    old.setDate(old.getDate() - 100)

    const products = [
      makeProduct({ dateAdded: recent.toISOString(), purchasePrice: 50, status: 'Listed' }),
      makeProduct({ id: '2', dateAdded: old.toISOString(), purchasePrice: 30, status: 'Listed' }),
    ]
    const buckets = stockAgeingBuckets(products)
    expect(buckets[0].count).toBe(1) // 0-30 days
    expect(buckets[3].count).toBe(1) // 90+ days
  })
})

describe('needsAttention', () => {
  it('returns alerts for stale stock', () => {
    const old = new Date()
    old.setDate(old.getDate() - 90)
    const products = [
      makeProduct({ dateAdded: old.toISOString(), status: 'Listed' }),
    ]
    const alerts = needsAttention(products, [])
    expect(alerts.length).toBeGreaterThan(0)
  })

  it('returns no alerts for fresh stock', () => {
    const fresh = new Date()
    fresh.setDate(fresh.getDate() - 5)
    const alerts = needsAttention(
      [makeProduct({ dateAdded: fresh.toISOString(), status: 'Listed', listingDate: fresh.toISOString() })],
      [],
    )
    expect(alerts).toHaveLength(0)
  })
})

describe('taxEstimate', () => {
  it('returns zero tax for low profit', () => {
    const result = taxEstimate(5000)
    expect(result.taxableProfit).toBe(0)
    expect(result.incomeTax).toBe(0)
    expect(result.ni).toBe(0)
    expect(result.totalTax).toBe(0)
  })

  it('calculates tax for higher profit', () => {
    const result = taxEstimate(40000)
    expect(result.taxableProfit).toBe(40000 - 12570)
    expect(result.incomeTax).toBeGreaterThan(0)
    expect(result.totalTax).toBeGreaterThan(0)
  })

  it('never returns negative', () => {
    const result = taxEstimate(-1000)
    expect(result.taxableProfit).toBe(0)
    expect(result.totalTax).toBe(0)
  })
})

describe('groupByMarketplace', () => {
  it('groups sold products by marketplace', () => {
    const products = [
      makeProduct({ salePrice: 100, profit: 30, saleMarketplace: 'eBay', status: 'Sold' }),
      makeProduct({ id: '2', salePrice: 50, profit: 10, saleMarketplace: 'eBay', status: 'Sold' }),
      makeProduct({ id: '3', salePrice: 80, profit: 20, saleMarketplace: 'Vinted', status: 'Sold' }),
    ]
    const groups = groupByMarketplace(products)
    expect(groups).toHaveLength(2)
    const ebay = groups.find((g) => g.marketplace === 'eBay')
    expect(ebay?.revenue).toBe(150)
    expect(ebay?.count).toBe(2)
  })
})

describe('groupByMonth', () => {
  it('groups sold products by month', () => {
    const products = [
      makeProduct({ salePrice: 100, saleDate: '2025-03-10', status: 'Sold' }),
      makeProduct({ id: '2', salePrice: 200, saleDate: '2025-03-20', status: 'Sold' }),
      makeProduct({ id: '3', salePrice: 50, saleDate: '2025-04-05', status: 'Sold' }),
    ]
    const groups = groupByMonth(products)
    expect(groups).toHaveLength(2)
    expect(groups[0].month).toBe('2025-03')
    expect(groups[0].revenue).toBe(300)
  })
})

describe('bestPerforming', () => {
  it('sorts brands by profit descending', () => {
    const products = [
      makeProduct({ salePrice: 100, profit: 30, brand: 'Nike', status: 'Sold' }),
      makeProduct({ id: '2', salePrice: 200, profit: 80, brand: 'Adidas', status: 'Sold' }),
    ]
    const result = bestPerforming(products, 'brand')
    expect(result[0].name).toBe('Adidas')
    expect(result[0].profit).toBe(80)
  })
})
