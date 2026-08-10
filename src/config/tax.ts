export type TaxYearConfig = {
  label: string
  personalAllowance: number
  basicRateThreshold: number
  higherRateThreshold: number
  basicRate: number
  higherRate: number
  additionalRate: number
  niLowerProfitLimit: number
  niUpperProfitLimit: number
  niLowerRate: number
  niUpperRate: number
}

export const TAX_YEARS: Record<number, TaxYearConfig> = {
  2025: {
    label: '2025/26',
    personalAllowance: 12570,
    basicRateThreshold: 50270,
    higherRateThreshold: 125140,
    basicRate: 0.2,
    higherRate: 0.4,
    additionalRate: 0.45,
    niLowerProfitLimit: 12570,
    niUpperProfitLimit: 50270,
    niLowerRate: 0.06,
    niUpperRate: 0.02,
  },
  2026: {
    label: '2026/27',
    personalAllowance: 12570,
    basicRateThreshold: 50270,
    higherRateThreshold: 125140,
    basicRate: 0.2,
    higherRate: 0.4,
    additionalRate: 0.45,
    niLowerProfitLimit: 12570,
    niUpperProfitLimit: 50270,
    niLowerRate: 0.06,
    niUpperRate: 0.02,
  },
}

export const DEFAULT_TAX_YEAR = 2026

export const TAX_CONFIG: TaxYearConfig = TAX_YEARS[DEFAULT_TAX_YEAR]

export function getTaxConfig(yearStart: number): TaxYearConfig {
  return TAX_YEARS[yearStart] ?? TAX_CONFIG
}

export function ukTaxYearStartForDate(date: Date): number {
  const year = date.getFullYear()
  return date >= new Date(year, 3, 6) ? year : year - 1
}

export function ukTaxYearLabel(yearStart: number): string {
  return `${yearStart}/${String((yearStart + 1) % 100).padStart(2, '0')}`
}

export function inUkTaxYear(date: Date, yearStart: number): boolean {
  const start = new Date(yearStart, 3, 6)
  const end = new Date(yearStart + 1, 3, 6)
  return date >= start && date < end
}

export function calculateIncomeTax(
  profit: number,
  config: TaxYearConfig = TAX_CONFIG,
): number {
  const taxable = Math.max(0, profit - config.personalAllowance)
  if (taxable <= 0) return 0

  const basicBand = config.basicRateThreshold - config.personalAllowance
  const higherBand = config.higherRateThreshold - config.basicRateThreshold

  const inBasic = Math.min(taxable, basicBand)
  const inHigher = Math.min(
    Math.max(taxable - basicBand, 0),
    higherBand,
  )
  const inAdditional = Math.max(
    taxable - (config.higherRateThreshold - config.personalAllowance),
    0,
  )

  return (
    inBasic * config.basicRate +
    inHigher * config.higherRate +
    inAdditional * config.additionalRate
  )
}

export function calculateClass4Ni(
  profit: number,
  config: TaxYearConfig = TAX_CONFIG,
): number {
  if (profit <= config.niLowerProfitLimit) return 0

  const mainBand = config.niUpperProfitLimit - config.niLowerProfitLimit
  const inLower = Math.min(
    Math.max(profit - config.niLowerProfitLimit, 0),
    mainBand,
  )
  const inUpper = Math.max(profit - config.niUpperProfitLimit, 0)

  return inLower * config.niLowerRate + inUpper * config.niUpperRate
}
