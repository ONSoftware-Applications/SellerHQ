import { useCallback } from 'react'
import { useSettings } from './useSettings'
import { formatCurrency, type CurrencyCode } from '../utils/format'

export function useCurrency() {
  const { settings } = useSettings()
  const currency = settings.business.defaultCurrency as CurrencyCode

  const money = useCallback(
    (amount: number, options?: { maximumFractionDigits?: number }) =>
      formatCurrency(amount, currency, options),
    [currency],
  )

  return { currency, money }
}