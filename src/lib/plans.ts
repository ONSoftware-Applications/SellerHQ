export type PlanId = 'basic' | 'growing' | 'pro' | 'business'

export type BillingCycle = 'monthly' | 'annual'

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
    stripePriceMonthlyId: '',
    stripePriceAnnualId: '',
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
    ],
    planned: ['Bundle templates for common sales'],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Advanced insights for serious sellers.',
    monthlyPrice: 10.99,
    highlighted: true,
    stripePriceMonthlyId: '',
    stripePriceAnnualId: '',
    available: [
      'Everything in Growing',
      'Up to 5,000 products & 5 businesses',
      'Advanced forecasts & scenario planning',
      'Full UK tax (VAT, quarterly deadlines, filing)',
      'Advanced reports & stock ageing',
      'Price ladder & profit optimisation',
      'Priority support',
    ],
    planned: [
      'Low-stock & reorder alerts',
      'Barcode scanning',
      'Custom product fields',
      'Email reminders',
      'Cash-flow projection',
      'Full backup export',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'For teams and multi-channel sellers.',
    monthlyPrice: 15.99,
    stripePriceMonthlyId: '',
    stripePriceAnnualId: '',
    available: [
      'Everything in Pro',
      'Unlimited products & businesses',
      '5 team seats',
      'Priority support',
    ],
    planned: [
      'Marketplace API integrations',
      'API & webhooks',
      'Accounting export (Xero & QuickBooks)',
      'Full audit log',
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
