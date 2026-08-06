import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

type BarcodeScannerProps = {
  onScan: (value: string) => void
  onError?: (error: string) => void
}

type ScannerControls = { stop: () => void }

export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<ScannerControls | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const scanningRef = useRef(true)

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const reader = new BrowserMultiFormatReader()

        const video = videoRef.current
        if (!video) return

        controlsRef.current = await reader.decodeFromVideoDevice(
          undefined,
          video,
          (result) => {
            if (!scanningRef.current || cancelled) return
            if (result && result.getText()) {
              scanningRef.current = false
              setScanning(false)
              onScan(result.getText())
            }
          },
        )

        if (cancelled) return
        setScanning(true)
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Unable to access camera'
        setError(msg)
        onError?.(msg)
      }
    }

    start()

    return () => {
      cancelled = true
      scanningRef.current = false
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [onScan, onError])

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
      <video
        ref={videoRef}
        style={{
          width: '100%',
          borderRadius: '12px',
          display: scanning ? 'block' : 'none',
          objectFit: 'cover',
          aspectRatio: '1',
        }}
      />

      {!scanning && !error && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--shq-ink-muted)', fontSize: '14px' }}>
          Starting camera…
        </div>
      )}

      {error && (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--shq-error)', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {scanning && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '70%',
            height: '45%',
            border: '3px solid var(--shq-accent)',
            borderRadius: '12px',
            boxShadow: '0 0 0 1000px rgb(0 0 0 / 30%)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}
