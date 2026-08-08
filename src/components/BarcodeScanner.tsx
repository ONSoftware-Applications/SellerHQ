import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'
import { DecodeHintType } from '@zxing/library'

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
  const controlsInstanceRef = useRef<IScannerControls | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        // Restrict to common 1D product barcode formats for faster scanning
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.CODE_128,
        ])

        const reader = new BrowserMultiFormatReader(hints)

        const video = videoRef.current
        if (!video) return

        controlsRef.current = await reader.decodeFromVideoDevice(
          undefined,
          video,
          (result) => {
            if (!scanningRef.current || cancelled) return
            if (result && result.getText()) {
              const text = result.getText().trim()
              onScan(text)
            }
          },
        )

        if (cancelled) return
        setScanning(true)
        controlsInstanceRef.current = controlsRef.current as unknown as IScannerControls

        // Check torch capability
        if (controlsInstanceRef.current?.streamVideoCapabilitiesGet) {
          try {
            const caps = controlsInstanceRef.current.streamVideoCapabilitiesGet(
              () => []
            )
            if (caps && 'torch' in caps) {
              setTorchAvailable(true)
            }
          } catch {
            // Torch capability check not supported
          }
        }
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

  const toggleTorch = async () => {
    if (!controlsInstanceRef.current?.switchTorch) return
    const newTorchState = !torchOn
    try {
      await controlsInstanceRef.current.switchTorch(newTorchState)
      setTorchOn(newTorchState)
    } catch {
      // Torch toggle failed
    }
 	}

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
        <>
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

          {torchAvailable && (
            <button
              type="button"
              onClick={toggleTorch}
              aria-label={torchOn ? 'Turn off torch' : 'Turn on torch'}
              title={torchOn ? 'Turn off torch' : 'Turn on torch'}
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: 'none',
                background: torchOn ? 'var(--shq-accent)' : 'rgba(255 255 255 / 0.9)',
                color: torchOn ? 'var(--shq-surface)' : 'var(--shq-ink)',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgb(0 0 0 / 20%)',
                transition: 'all 0.2s',
              }}
            >
              {torchOn ? '🔦' : '⚡'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
