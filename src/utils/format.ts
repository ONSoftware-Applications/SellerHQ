export type CurrencyCode = 'GBP' | 'EUR' | 'USD'

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  GBP: '£',
  EUR: '€',
  USD: '$',
}

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'GBP',
  options: { maximumFractionDigits?: number } = {},
): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? '£'
  const { maximumFractionDigits = 2 } = options
  const formatted = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(amount || 0)
  return `${symbol}${formatted}`
}

export function formatDate(
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  },
): string {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', options)
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}