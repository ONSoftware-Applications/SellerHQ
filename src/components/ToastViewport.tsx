import { useToast } from '../hooks/useToast'
import type { ToastType } from '../context/ToastContext'

const TOAST_STYLES: Record<ToastType, { icon: string; bg: string; border: string; color: string }> = {
  success: { icon: '✓', bg: 'var(--shq-success-bg, #f0fdf4)', border: 'var(--shq-success-border, #bbf7d0)', color: 'var(--shq-success-text, #166534)' },
  error: { icon: '✕', bg: 'var(--shq-error-bg, #fef2f2)', border: 'var(--shq-error-border, #fecaca)', color: 'var(--shq-error-text, #991b1b)' },
  info: { icon: 'ℹ', bg: 'var(--shq-info-bg, #eff6ff)', border: 'var(--shq-info-border, #bfdbfe)', color: 'var(--shq-info-text, #1e40af)' },
  warning: { icon: '⚠', bg: 'var(--shq-warning-bg, #fffbeb)', border: 'var(--shq-warning-border, #fde68a)', color: 'var(--shq-warning-text, #92400e)' },
}

function ToastViewport() {
  const { toasts, dismissToast } = useToast()

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 1000,
        maxWidth: '360px',
      }}
    >
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type]
        return (
          <div
            key={toast.id}
            role="status"
            onClick={() => dismissToast(toast.id)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: style.bg,
              border: `1px solid ${style.border}`,
              color: style.color,
              fontSize: '13px',
              fontWeight: '500',
              boxShadow: '0 8px 24px rgb(20 33 61 / 10%)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontWeight: 700, flexShrink: 0 }}>{style.icon}</span>
            <span>{toast.message}</span>
          </div>
        )
      })}
    </div>
  )
}

export default ToastViewport