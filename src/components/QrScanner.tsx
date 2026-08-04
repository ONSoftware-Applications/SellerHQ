import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

type QrScannerProps = {
  onScan: (value: string) => void
  onError?: (error: string) => void
}

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        const video = videoRef.current
        if (!video) return

        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        await video.play()
        setScanning(true)
        tick()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to access camera'
        setError(msg)
        onError?.(msg)
      }
    }

    function tick() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const width = video.videoWidth
      const height = video.videoHeight
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      ctx.drawImage(video, 0, 0, width, height)
      const imageData = ctx.getImageData(0, 0, width, height)
      const code = jsQR(imageData.data, width, height, {
        inversionAttempts: 'dontInvert',
      })

      if (code && code.data) {
        onScan(code.data)
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    start()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
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
      <canvas ref={canvasRef} style={{ display: 'none' }} />

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
            width: '60%',
            height: '60%',
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