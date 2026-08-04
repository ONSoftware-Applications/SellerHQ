// Centralised UK tax thresholds and rates. Keeping these in one place makes
// the Tax page and future tests easy to maintain.

export const TAX_CONFIG = {
  // Income tax
  personalAllowance: 12570,
  basicRateThreshold: 50270,
  higherRateThreshold: 125140,
  basicRate: 0.2,
  higherRate: 0.4,
  additionalRate: 0.45,

  // National Insurance (self-employed, Class 4)
  niThreshold: 12570,
  niRate: 0.06,

  // VAT
  vatRate: 0.2,
  vatRegistrationThreshold: 85000,
} as const

export const INCOME_TAX_BRACKETS = [
  { max: 37700, rate: 0.2 },
  { max: 87440, rate: 0.4 },
  { max: Infinity, rate: 0.45 },
] as const

export function calculateIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0

  let tax = 0
  let remaining = taxableIncome

  for (const bracket of INCOME_TAX_BRACKETS) {
    const amountInBracket = Math.min(remaining, bracket.max)
    tax += amountInBracket * bracket.rate
    remaining -= amountInBracket
    if (remaining <= 0) break
  }

  return tax
}

export function calculateClass4Ni(taxableIncome: number): number {
  return taxableIncome > TAX_CONFIG.niThreshold
    ? (taxableIncome - TAX_CONFIG.niThreshold) * TAX_CONFIG.niRate
    : 0
}