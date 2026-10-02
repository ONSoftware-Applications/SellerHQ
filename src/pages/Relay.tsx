import { useCallback, useEffect, useMemo, useState } from 'react'

import Icon from '../components/Icon'
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

function formatPayload(payload: string): string {
  try {
    const url = new URL(payload)
    return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`
  } catch {
    return payload
  }
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

  const latest = scans[0]
  const latestProduct = useMemo(() => {
    if (!latest) return undefined
    const productId = extractProductId(latest.payload)
    return productId ? getProduct(productId) : undefined
  }, [getProduct, latest])

  const connectionLabel = relayError
    ? 'Connection issue'
    : listening
      ? 'Connected'
      : 'Connecting'

  return (
    <div className="relay-v2">
      <header className="relay-v2-header">
        <div>
          <span className="workspace-v2-eyebrow">Operations</span>
          <h1>Scan Relay</h1>
          <p>Scan products on your phone and open them instantly on this computer.</p>
        </div>

        <div className={`relay-v2-live-badge ${relayError ? 'error' : listening ? 'live' : 'connecting'}`}>
          <span className="relay-v2-live-dot" />
          <div>
            <strong>{relayError ? 'OFFLINE' : listening ? 'LIVE' : 'CONNECTING'}</strong>
            <span>{relayError ? 'Relay needs attention' : listening ? 'Listening for phone scans' : 'Establishing relay connection'}</span>
          </div>
        </div>
      </header>

      <section className="relay-v2-status-strip" aria-label="Relay status">
        <div>
          <span>Connection</span>
          <strong>{connectionLabel}</strong>
          <small>{listening && !relayError ? 'Relay ready' : relayError ? 'Check connection below' : 'Starting listener'}</small>
        </div>
        <div>
          <span>Recent scans</span>
          <strong>{scans.length}</strong>
          <small>Retained for up to 7 days</small>
        </div>
        <div>
          <span>Last scan</span>
          <strong>{latest ? formatTime(latest.createdAt) : '—'}</strong>
          <small>{latestProduct?.name ?? (latest ? 'External or unknown QR' : 'Waiting for a scan')}</small>
        </div>
      </section>

      {relayError && (
        <div className="relay-v2-error">
          <span className="relay-v2-error-icon"><Icon name="alert" size={18} /></span>
          <div>
            <strong>Relay connection issue</strong>
            <span>{relayError}</span>
          </div>
        </div>
      )}

      <div className="relay-v2-layout">
        <section className="panel-v2 relay-v2-feed">
          <header className="panel-v2-header relay-v2-panel-header">
            <div>
              <h2>Live scans</h2>
              <p>New phone scans appear here automatically.</p>
            </div>
            {scans.length > 0 && (
              <button
                type="button"
                className="panel-v2-link"
                onClick={handleClear}
                disabled={clearing}
              >
                {clearing ? 'Clearing…' : 'Clear history'}
              </button>
            )}
          </header>

          {scans.length === 0 ? (
            <div className="relay-v2-empty">
              <div className={`relay-v2-empty-icon ${listening && !relayError ? 'active' : ''}`}>
                <Icon name="relay" size={28} />
              </div>
              <h3>{relayError ? 'Relay is not connected' : listening ? 'Ready for your first scan' : 'Connecting to Scan Relay'}</h3>
              <p>
                {relayError
                  ? 'Once the relay reconnects, scans from your phone will appear here automatically.'
                  : 'Open SellerHQ on your phone, enable Sync to laptop, then scan a product QR code.'}
              </p>
              <span className={`relay-v2-empty-status ${listening && !relayError ? 'active' : ''}`}>
                <i />
                {listening && !relayError ? 'Relay connected' : relayError ? 'Relay offline' : 'Connecting'}
              </span>
            </div>
          ) : (
            <div className="relay-v2-scan-list">
              {scans.map((entry, index) => {
                const productId = extractProductId(entry.payload)
                const product = productId ? getProduct(productId) : undefined
                const isLatest = index === 0

                return (
                  <article
                    key={entry.id}
                    className={`relay-v2-scan-row ${isLatest ? 'latest' : ''}`}
                  >
                    <div className="relay-v2-scan-icon">
                      <Icon name={product ? 'package' : 'scan'} size={17} />
                    </div>

                    <div className="relay-v2-scan-main">
                      {isLatest && <span className="relay-v2-latest-label">Latest scan</span>}
                      <strong>{product?.name ?? formatPayload(entry.payload)}</strong>
                      <span>
                        {product
                          ? [
                              product.code,
                              product.sku,
                              product.status,
                              product.storageLocation,
                            ].filter(Boolean).join(' · ')
                          : 'External or unrecognised QR code'}
                      </span>
                    </div>

                    <time className="relay-v2-scan-time" dateTime={new Date(entry.createdAt).toISOString()}>
                      {formatTime(entry.createdAt)}
                    </time>

                    <button
                      type="button"
                      className={isLatest ? 'primary-button relay-v2-open-button' : 'secondary-button relay-v2-open-button'}
                      onClick={() => openScan(entry)}
                    >
                      {product ? 'Open product' : 'Open'}
                      <Icon name="arrow-right" size={13} />
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <aside className="panel-v2 relay-v2-control">
          <header className="panel-v2-header">
            <div>
              <h2>Relay control</h2>
              <p>Phone-to-computer scanning</p>
            </div>
          </header>

          <div className="relay-v2-control-body">
            <div className="relay-v2-device-flow" aria-hidden="true">
              <div className="relay-v2-device">
                <Icon name="scan" size={20} />
                <span>Phone</span>
              </div>
              <span className="relay-v2-flow-line"><i /></span>
              <div className="relay-v2-hub">
                <Icon name="relay" size={21} />
              </div>
              <span className="relay-v2-flow-line"><i /></span>
              <div className="relay-v2-device">
                <Icon name="dashboard" size={20} />
                <span>Laptop</span>
              </div>
            </div>

            <div className="relay-v2-ready">
              <span className={`relay-v2-ready-icon ${listening && !relayError ? 'active' : ''}`}>
                <Icon name={relayError ? 'alert' : 'check'} size={17} />
              </span>
              <div>
                <strong>{relayError ? 'Connection needs attention' : listening ? 'Laptop ready' : 'Connecting laptop'}</strong>
                <span>
                  {listening && !relayError
                    ? `This computer is listening for scans from ${currentBusiness?.name ?? 'your business'}.`
                    : relayError
                      ? 'The live listener is currently unavailable.'
                      : 'SellerHQ is establishing the live relay.'}
                </span>
              </div>
            </div>

            <ol className="relay-v2-steps">
              <li>
                <span>1</span>
                <div><strong>Open SellerHQ on your phone</strong><small>Use the same business as this computer.</small></div>
              </li>
              <li>
                <span>2</span>
                <div><strong>Open Scan QR</strong><small>Turn on <b>Sync to laptop</b>.</small></div>
              </li>
              <li>
                <span>3</span>
                <div><strong>Scan a product label</strong><small>The result appears in the live feed instantly.</small></div>
              </li>
            </ol>

            <div className="relay-v2-diagnostics">
              <div><span>Relay</span><strong className={listening && !relayError ? 'positive' : relayError ? 'negative' : ''}>{connectionLabel}</strong></div>
              <div><span>Business</span><strong>{currentBusiness?.name ?? '—'}</strong></div>
              <div><span>History</span><strong>7 days</strong></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Relay
