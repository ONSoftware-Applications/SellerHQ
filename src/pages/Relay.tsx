import { useCallback, useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useProducts } from '../hooks/useProducts'
import { useQrRelay } from '../hooks/useQrRelay'

type ScanEntry = {
  id: string
  payload: string
  createdAt: number
}

function extractProductId(payload: string): string | null {
  const match = payload.match(/\/products\/([^/?#]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Relay() {
  const { currentBusiness } = useBusiness()
  const { getProduct } = useProducts()
  const { listening, error: relayError, listen, stop } = useQrRelay()

  const [scans, setScans] = useState<ScanEntry[]>([])
  const [clearing, setClearing] = useState(false)

  const businessId = currentBusiness?.id

  const loadRecent = useCallback(async () => {
    if (!businessId) return

    await supabase
      .from('qr_relay_scans')
      .delete()
      .eq('business_id', businessId)
      .lt(
        'created_at',
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      )

    const { data } = await supabase
      .from('qr_relay_scans')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      setScans(
        data.map((row) => ({
          id: row.id,
          payload: row.payload as string,
          createdAt: new Date(row.created_at as string).getTime(),
        })),
      )
    }
  }, [businessId])

  useEffect(() => {
    if (!businessId) return

    void loadRecent()

    listen(businessId, (payload) => {
      setScans((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            payload,
            createdAt: Date.now(),
          },
          ...prev,
        ].slice(0, 100),
      )
    })

    return () => stop()
  }, [businessId, loadRecent, listen, stop])

  async function handleClear() {
    if (!businessId) return
    setClearing(true)
    await supabase
      .from('qr_relay_scans')
      .delete()
      .eq('business_id', businessId)
    setScans([])
    setClearing(false)
  }

  function openScan(entry: ScanEntry) {
    const productId = extractProductId(entry.payload)
    if (productId) {
      window.location.href = `/products/${productId}`
      return
    }
    window.open(entry.payload, '_blank', 'noopener,noreferrer')
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 16px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>
          Scan Relay
        </h1>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: listening ? 'var(--shq-success-text, #16a34a)' : 'var(--shq-ink-muted)',
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: listening ? '#16a34a' : '#999',
              display: 'inline-block',
            }}
          />
          {listening ? 'Listening' : 'Connecting…'}
        </div>
      </div>

      <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: 'var(--shq-ink-muted)', lineHeight: '1.6' }}>
        Open Seller Hub on your phone, go to <strong>Scan QR</strong>, turn on{' '}
        <strong>Sync to laptop</strong>, and scan a product label. It appears here instantly.
      </p>

      {relayError && (
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
          {relayError}
        </div>
      )}

      {scans.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--shq-ink-muted)',
            fontSize: '14px',
            border: '1px dashed var(--shq-border)',
            borderRadius: '12px',
          }}
        >
          {listening
            ? 'No scans yet. Waiting for a scan from your phone…'
            : 'Connecting to live scans…'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {scans.map((entry, index) => {
            const productId = extractProductId(entry.payload)
            const product = productId ? getProduct(productId) : undefined
            return (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '14px 16px',
                  background: 'var(--shq-surface)',
                  border: index === 0 ? '1px solid var(--shq-accent)' : '1px solid var(--shq-border)',
                  borderRadius: '10px',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'var(--shq-ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {product ? product.name : entry.payload}
                  </div>
                  {product && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--shq-ink-muted)',
                        marginTop: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.payload}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <div style={{ fontSize: '12px', color: 'var(--shq-ink-muted)' }}>
                    {formatTime(entry.createdAt)}
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => openScan(entry)}
                  >
                    Open
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {scans.length > 0 && (
        <button
          type="button"
          className="secondary-button"
          onClick={handleClear}
          disabled={clearing}
          style={{ marginTop: '16px' }}
        >
          {clearing ? 'Clearing…' : 'Clear all'}
        </button>
      )}
    </div>
  )
}

export default Relay