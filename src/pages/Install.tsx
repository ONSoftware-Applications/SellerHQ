import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Platform = 'ios' | 'android' | 'mac' | 'windows' | 'other'

function detectPlatform(ua: string): Platform {
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  if (/mac/i.test(ua)) return 'mac'
  if (/win/i.test(ua)) return 'windows'
  return 'other'
}

function Install() {
  const navigate = useNavigate()
  const [platform, setPlatform] = useState<Platform>('other')
  const [canInstall, setCanInstall] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)

  useEffect(() => {
    setPlatform(detectPlatform(navigator.userAgent))

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    const prompt = deferredPrompt as unknown as { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      setCanInstall(false)
      setDeferredPrompt(null)
    }
  }

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true

  const platformLabel: Record<Platform, string> = {
    ios: 'iPhone / iPad',
    android: 'Android',
    mac: 'Mac',
    windows: 'Windows',
    other: 'Your device',
  }

  const instructions: Record<Platform, React.ReactNode> = {
    ios: (
      <>
        <li>Tap the <strong>Share</strong> button <span style={{ fontSize: '16px' }}>􀈂</span> in Safari's toolbar</li>
        <li>Scroll down and select <strong>Add to Home Screen</strong></li>
        <li>Confirm the name and tap <strong>Add</strong></li>
      </>
    ),
    android: (
      <>
        <li>Tap the <strong>three-dot menu</strong> (⋮) in the top-right corner of Chrome</li>
        <li>Select <strong>Add to Home screen</strong></li>
        <li>Confirm by tapping <strong>Add</strong></li>
      </>
    ),
    mac: (
      <>
        <li>Tap the <strong>Share</strong> button in Safari's toolbar</li>
        <li>Select <strong>Add to Home Screen</strong></li>
        <li>Confirm the name and tap <strong>Add</strong></li>
      </>
    ),
    windows: (
      <>
        <li>Click the <strong>three-dot menu</strong> (⋮) in the top-right corner</li>
        <li>Select <strong>Cast, save, and share</strong> → <strong>Install page as app</strong></li>
        <li>Confirm by clicking <strong>Install</strong></li>
      </>
    ),
    other: (
      <>
        <li>Open this page in Chrome, Edge, or Safari</li>
        <li>Look for an <strong>Install</strong> or <strong>Add to Home Screen</strong> option in the browser menu</li>
        <li>Confirm the installation</li>
      </>
    ),
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>
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

      <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700' }}>
        Install SellerHQ
      </h1>
      <p style={{ margin: '0 0 32px 0', fontSize: '14px', color: 'var(--shq-ink-muted)', lineHeight: '1.6' }}>
        Add SellerHQ to your device for quick access — works just like the website but lives on your home screen or taskbar.
      </p>

      {isStandalone && (
        <div
          style={{
            background: 'var(--shq-success-bg)',
            border: '1px solid var(--shq-success-border)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            fontSize: '14px',
            color: 'var(--shq-success-text)',
          }}
        >
          SellerHQ is already installed on this device.
        </div>
      )}

      <div
        style={{
          background: 'var(--shq-surface)',
          border: '1px solid var(--shq-border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
          {platformLabel[platform]}
        </h3>

        {canInstall ? (
          <button
            type="button"
            onClick={handleInstall}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--shq-accent)',
              color: '#1a1205',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '16px',
            }}
          >
            Install now
          </button>
        ) : (
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--shq-ink-muted)', lineHeight: '1.6' }}>
            Use your browser's install option to add SellerHQ:
          </p>
        )}

        <ol style={{ margin: 0, padding: '0 0 0 20px', fontSize: '14px', lineHeight: '2', color: 'var(--shq-ink)' }}>
          {instructions[platform]}
        </ol>
      </div>

      <div
        style={{
          background: 'var(--shq-surface)',
          border: '1px solid var(--shq-border)',
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
          What you get
        </h3>
        <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: '14px', lineHeight: '2', color: 'var(--shq-ink)' }}>
          <li>Launches from your home screen or taskbar</li>
          <li>No browser address bar — full screen experience</li>
          <li>Works offline for cached pages</li>
          <li>Same features as the website</li>
        </ul>
      </div>
    </div>
  )
}

export default Install