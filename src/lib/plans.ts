export type PlanId = 'basic' | 'growing' | 'pro' | 'business'

export type BillingCycle = 'monthly' | 'annual'

export type PlanFeature =
  | 'listings'
  | 'forecasts'
  | 'reports'
  | 'bundleSales'
  | 'autoRelist'
  | 'multiCurrency'
  | 'qrScanner'
  | 'fullTax'
  | 'advancedForecasts'
  | 'bundleTemplates'
  | 'cashFlow'
  | 'lowStock'
  | 'backupExport'
  | 'accountingExport'
  | 'auditLog'
  | 'customization'
  | 'barcodeScanning'

export const PLAN_LIMITS: Record<
  PlanId,
  { products: number; businesses: number }
> = {
  basic: { products: 50, businesses: 1 },
  growing: { products: 500, businesses: 2 },
  pro: { products: 5000, businesses: 5 },
  business: { products: Infinity, businesses: Infinity },
}

const PRO_FEATURES: PlanFeature[] = [
  'listings',
  'forecasts',
  'reports',
  'bundleSales',
  'autoRelist',
  'multiCurrency',
  'qrScanner',
  'fullTax',
  'advancedForecasts',
  'bundleTemplates',
  'cashFlow',
  'lowStock',
  'backupExport',
]

const BUSINESS_FEATURES: PlanFeature[] = [
  ...PRO_FEATURES,
  'accountingExport',
  'auditLog',
  'customization',
  'barcodeScanning',
]

export const PLAN_FEATURES: Record<PlanId, PlanFeature[]> = {
  basic: [],
  growing: [
    'listings',
    'forecasts',
    'reports',
    'bundleSales',
    'autoRelist',
    'multiCurrency',
    'qrScanner',
    'bundleTemplates',
  ],
  pro: PRO_FEATURES,
  business: BUSINESS_FEATURES,
}

export function planCanUse(
  plan: PlanId,
  feature: PlanFeature,
): boolean {
  return PLAN_FEATURES[plan].includes(feature)
}

export function planProductLimit(plan: PlanId): number {
  return PLAN_LIMITS[plan].products
}

export function planBusinessLimit(plan: PlanId): number {
  return PLAN_LIMITS[plan].businesses
}

export type Plan = {
  id: PlanId
  name: string
  tagline: string
  monthlyPrice: number
  available: string[]
  planned: string[]
  highlighted?: boolean
  stripePriceMonthlyId: string
  stripePriceAnnualId: string
}

export const ANNUAL_DISCOUNT = 0.05

export const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    tagline: 'Everything you need to start reselling.',
    monthlyPrice: 0,
    stripePriceMonthlyId: '',
    stripePriceAnnualId: '',
    available: [
      'Up to 50 products',
      '1 business',
      'Full inventory tracking & statuses',
      'Product photos, labels & QR codes',
      'Dashboard overview & key metrics',
      'Record sales & sold list',
      'Expense tracking',
      'Pricing calculator',
      'Basic UK tax estimate',
      'PWA app, mobile & dark mode',
      'CSV export (up to 100 rows)',
    ],
    planned: [],
  },
  {
    id: 'growing',
    name: 'Growing',
    tagline: 'For sellers scaling up their stock.',
    monthlyPrice: 5.99,
    stripePriceMonthlyId: 'price_1Tycu8LZEvUFW978bKkCw0RA',
    stripePriceAnnualId: 'price_1U19gtLZEvUFW978imQZ37q9',
    available: [
      'Everything in Basic',
      'Up to 500 products & 2 businesses',
      'Bundle sales',
      'Listings module & auto-relist',
      'Shipping status flow',
      'Sales analytics by marketplace & month',
      'Reports (P&L, inventory health)',
      'Forecasts (historical trend & predictions)',
      'Multi-currency support',
      'Mobile QR scanner',
      'Full CSV import & export',
      'Bundle templates',
    ],
    planned: [],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Advanced insights for serious sellers.',
    monthlyPrice: 10.99,
    highlighted: true,
    stripePriceMonthlyId: 'price_1TycuoLZEvUFW978trVrtQku',
    stripePriceAnnualId: 'price_1U19kWLZEvUFW978guX6OxPS',
    available: [
      'Everything in Growing',
      'Up to 5,000 products & 5 businesses',
      'Advanced forecasts & scenario planning',
      'Full UK tax (VAT, quarterly deadlines, filing)',
      'Advanced reports & stock ageing',
      'Low-stock & reorder alerts',
      'Cash-flow projection',
      'Full backup export',
      'Price ladder & profit optimisation',
      'Priority support',
    ],
    planned: [
      'Barcode scanning',
      'Custom product fields',
      'Email reminders',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'For teams and multi-channel sellers.',
    monthlyPrice: 15.99,
    stripePriceMonthlyId: 'price_1TycvULZEvUFW9784K3Yl4X6',
    stripePriceAnnualId: 'price_1U19lWLZEvUFW978AzxIX8Vi',
    available: [
      'Everything in Pro',
      'Unlimited products & businesses',
      '5 team seats',
      'Business customization (logo & branding)',
      'Full audit log',
      'Accounting export',
      'Barcode scanning',
      'Priority support',
    ],
    planned: [
      'Marketplace API integrations',
      'API & webhooks',
      'White-label branding',
    ],
  },
]

export function annualTotal(monthlyPrice: number): number {
  return monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT)
}

export function annualPerMonth(monthlyPrice: number): number {
  return monthlyPrice * (1 - ANNUAL_DISCOUNT)
}

export function getPlan(planId: PlanId): Plan {
  return PLANS.find((plan) => plan.id === planId) ?? PLANS[0]
}
