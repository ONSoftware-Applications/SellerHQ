import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined

export const monitoringEnabled = Boolean(dsn)

export function initMonitoring() {
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: (import.meta.env.VITE_SENTRY_RELEASE as string | undefined) || undefined,
  })
}

export function reportError(error: unknown, source?: string) {
  if (!monitoringEnabled) return

  const context: Sentry.CaptureContext | undefined = source
    ? { tags: { source } }
    : undefined

  if (error instanceof Error) {
    Sentry.captureException(error, context)
    return
  }

  Sentry.captureMessage(
    typeof error === 'string' ? error : JSON.stringify(error),
    'error',
  )
}
