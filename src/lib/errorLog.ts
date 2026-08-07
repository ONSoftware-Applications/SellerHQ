const MAX_ERRORS = 10
const STORAGE_KEY = 'sellerhq_error_log'

export type CapturedError = {
  message: string
  stack?: string
  source?: string
  timestamp: number
}

export function captureError(error: unknown, source?: string) {
  try {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown error'
    const stack = error instanceof Error ? error.stack : undefined

    const entry: CapturedError = {
      message,
      stack,
      source,
      timestamp: Date.now(),
    }

    const raw = sessionStorage.getItem(STORAGE_KEY)
    const existing: CapturedError[] = (() => {
      try {
        const parsed = JSON.parse(raw ?? '[]')
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    })()
    const updated = [entry, ...existing].slice(0, MAX_ERRORS)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // sessionStorage is unavailable — silently ignore
  }
}

export function loadErrorLog(): CapturedError[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CapturedError[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function clearErrorLog() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
