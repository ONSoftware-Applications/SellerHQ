import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { QrScanner } from '../components/QrScanner'
import { useBluetooth } from '../hooks/useBluetooth'
import { useSubscription } from '../hooks/useSubscription'

function isMobile() {
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent)
}

function Scan() {
  const navigate = useNavigate()
  const { canUse } = useSubscription()
  const bluetooth = useBluetooth()

  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [relayEnabled, setRelayEnabled] = useState(false)

  const handleScan = useCallback(
    async (value: string) => {
      setError('')
      setResult(value)

      if (!relayEnabled) {
        if (value.startsWith(window.location.origin)) {
          const match = value.match(/\/products\/(.+)$/)
          if (match) {
            navigate(`/products/${match[1]}`)
            return
          }
        }
        setError(`Scanned: ${value} — not a recognised product QR code.`)
        return
      }

      // Bluetooth relay mode: send scan result to connected device
      if (!bluetooth.connected) {
        const conn = await bluetooth.connect()
        if (!conn) {
          setError(bluetooth.error || 'Failed to connect to Bluetooth device.')
          return
        }
      }

      const sent = await bluetooth.send(value)
      if (sent) {
        setResult(value)
      } else {
        setError('Scanned but failed to relay via Bluetooth. Showing locally instead.')
        if (value.startsWith(window.location.origin)) {
          const match = value.match(/\/products\/(.+)$/)
          if (match) {
            navigate(`/products/${match[1]}`)
            return
          }
        }
      }
    },
    [navigate, relayEnabled, bluetooth],
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

      {canUse('bluetoothScanning') && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--shq-surface)',
          border: '1px solid var(--shq-border)',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: '13px' }}>
            <strong>Bluetooth relay</strong>
            <div style={{ fontSize: '11px', color: 'var(--shq-ink-muted)', marginTop: '2px' }}>
              {bluetooth.connected ? 'Connected to laptop' : 'Send scans to a paired laptop'}
            </div>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '24px' }}>
            <input
              type="checkbox"
              checked={relayEnabled}
              onChange={(e) => {
                setRelayEnabled(e.target.checked)
                if (e.target.checked && !bluetooth.connected) {
                  bluetooth.connect()
                }
              }}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: relayEnabled ? 'var(--shq-accent)' : '#ccc',
              transition: '.4s',
              borderRadius: '24px',
            }}>
              <span style={{
                position: 'absolute',
                height: '16px',
                width: '16px',
                left: relayEnabled ? '22px' : '4px',
                bottom: '4px',
                background: 'white',
                transition: '.4s',
                borderRadius: '50%',
              }} />
            </span>
          </label>
        </div>
      )}

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
