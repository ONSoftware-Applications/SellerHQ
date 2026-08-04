import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { QrScanner } from '../components/QrScanner'

function isMobile() {
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent)
}

function Scan() {
  const navigate = useNavigate()
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const handleScan = useCallback(
    (value: string) => {
      setResult(value)

      if (value.startsWith(window.location.origin)) {
        const match = value.match(/\/products\/(.+)$/)
        if (match) {
          navigate(`/products/${match[1]}`)
          return
        }
      }

      setError(`Scanned: ${value} — not a recognised product QR code.`)
    },
    [navigate],
  )

  if (!isMobile()) {
    return (
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px' }}>
          QR Scanner
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--shq-ink-muted)', lineHeight: '1.6' }}>
          The QR scanner is only available on mobile devices with a camera.
          Open this page on your phone to scan product labels.
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px' }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--shq-ink-muted)',
          fontSize: '14px',
          cursor: 'pointer',
          padding: 0,
          marginBottom: '16px',
        }}
      >
        ← Back
      </button>

      <h1 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: '700' }}>
        Scan QR Code
      </h1>
      <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: 'var(--shq-ink-muted)', lineHeight: '1.6' }}>
        Point your camera at a product label QR code to open the product details.
      </p>

      {error && (
        <div
          style={{
            background: 'var(--shq-error-bg)',
            border: '1px solid var(--shq-error-border)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '16px',
            fontSize: '13px',
            color: 'var(--shq-error-text)',
          }}
        >
          {error}
        </div>
      )}

      <QrScanner onScan={handleScan} />

      {result && !error && (
        <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--shq-ink-muted)', textAlign: 'center' }}>
          Scanned: {result}
        </p>
      )}
    </div>
  )
}

export default Scan