import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useSubscription } from '../hooks/useSubscription'
import { useToast } from '../hooks/useToast'
import { compressImage } from '../lib/compressImage'
import { logAudit } from '../lib/audit'
import Toggle from '../components/Toggle'

const ACCENT_OPTIONS = [
  '#fca311',
  '#1a7f64',
  '#1d4ed8',
  '#7c3aed',
  '#db2777',
  '#b91c1c',
]

function BusinessCustomization() {
  const navigate = useNavigate()
  const { currentBusiness, refreshBusinesses } = useBusiness()
  const { canUse, plan } = useSubscription()
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [accent, setAccent] = useState(
    currentBusiness?.accent_color ?? ACCENT_OPTIONS[0],
  )
  const [whiteLabel, setWhiteLabel] = useState(
    currentBusiness?.white_label ?? false,
  )
  const [appName, setAppName] = useState(
    currentBusiness?.app_name ?? '',
  )
  const [labelBranding, setLabelBranding] = useState(
    currentBusiness?.label_branding ?? false,
  )

  if (!currentBusiness) {
    return (
      <div className="inventory-page" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: 'var(--shq-ink-muted)' }}>Select a business first.</p>
      </div>
    )
  }

  async function handleLogoSelected(file: File) {
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      const ext = compressed.type
        ? (compressed.type.split('/').pop() ?? 'png')
        : 'png'
      const path = `${currentBusiness!.id}/logo.${ext}`

      const { error } = await supabase.storage
        .from('business-assets')
        .upload(path, compressed, { upsert: true })

      if (error) throw error

      const {
        data: { publicUrl },
      } = supabase.storage.from('business-assets').getPublicUrl(path)

      await saveBusiness({ logo_url: publicUrl })
      showToast('Logo updated', 'success')
    } catch (err) {
      console.error(err)
      showToast('Logo could not be uploaded', 'error')
    } finally {
      setUploading(false)
    }
  }

  async function saveBusiness(patch: Record<string, unknown>) {
    const { error } = await supabase
      .from('businesses')
      .update(patch)
      .eq('id', currentBusiness!.id)

    if (error) {
      console.error(error)
      showToast('Could not save changes', 'error')
      return
    }

    void logAudit('business.updated', patch, currentBusiness!.id)
    await refreshBusinesses()
  }

  async function handleRemoveLogo() {
    await saveBusiness({ logo_url: null })
    showToast('Logo removed', 'success')
  }

  async function handleAccentChange(value: string) {
    setAccent(value)
    await saveBusiness({ accent_color: value })
    showToast('Accent colour updated', 'success')
  }

  async function handleWhiteLabelChange(value: boolean) {
    setWhiteLabel(value)
    await saveBusiness({ white_label: value })
    showToast(
      value
        ? 'White-label branding enabled'
        : 'White-label branding disabled',
      'success',
    )
  }

  async function handleAppNameSave() {
    const trimmed = appName.trim()
    await saveBusiness({ app_name: trimmed ? trimmed : null })
    if (trimmed) setAppName(trimmed)
    showToast('App name updated', 'success')
  }

  async function handleLabelBrandingChange(value: boolean) {
    setLabelBranding(value)
    await saveBusiness({ label_branding: value })
    showToast(
      value
        ? 'Branding will appear on printed labels and QR codes'
        : 'Branding removed from printed labels and QR codes',
      'success',
    )
  }

  return (
    <div className="inventory-page" style={{ maxWidth: 680 }}>
      <button
        type="button"
        className="text-button"
        style={{ marginBottom: 16 }}
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700 }}>
        Business customization
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--shq-ink-muted)' }}>
        Branding for {currentBusiness.name}.
      </p>

      {!canUse('customization') && (
        <div
          style={{
            padding: '16px 20px',
            background: 'var(--shq-warning-bg)',
            border: '1px solid var(--shq-warning-border)',
            borderRadius: 12,
            fontSize: 13,
            color: 'var(--shq-warning)',
            marginBottom: 24,
          }}
        >
          Business customization is a Business plan feature. Your current plan
          is {plan}.
          <button
            type="button"
            className="secondary-button"
            style={{ marginLeft: 12, fontSize: 12, padding: '4px 10px' }}
            onClick={() => navigate('/subscriptions')}
          >
            Upgrade
          </button>
        </div>
      )}

      <div
        style={{
          background: 'var(--shq-surface)',
          border: '1px solid var(--shq-border)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Business logo</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {currentBusiness.logo_url ? (
            <img
              src={currentBusiness.logo_url}
              alt="Business logo"
              style={{
                width: 72,
                height: 72,
                borderRadius: 12,
                objectFit: 'cover',
                border: '1px solid var(--shq-border)',
                background: 'var(--shq-surface-muted)',
              }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 12,
                background: 'var(--shq-surface-muted)',
                border: '1px dashed var(--shq-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                color: 'var(--shq-ink-faint)',
              }}
            >
              {currentBusiness.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleLogoSelected(file)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              className="secondary-button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : currentBusiness.logo_url ? 'Change logo' : 'Upload logo'}
            </button>
            {currentBusiness.logo_url && (
              <button
                type="button"
                className="secondary-button"
                onClick={handleRemoveLogo}
                disabled={uploading}
                style={{ marginLeft: 8 }}
              >
                Remove logo
              </button>
            )}
            <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--shq-ink-muted)' }}>
              Used as your business branding throughout the app.
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          background: 'var(--shq-surface)',
          border: '1px solid var(--shq-border)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Accent colour</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {ACCENT_OPTIONS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Use accent colour ${color}`}
              onClick={() => handleAccentChange(color)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: color,
                border: accent === color ? '3px solid var(--shq-ink)' : '2px solid var(--shq-border)',
                cursor: 'pointer',
              }}
            />
          ))}
          <label
            style={{
              position: 'relative',
              width: 40,
              height: 40,
              borderRadius: 10,
              overflow: 'hidden',
              cursor: 'pointer',
              border: '2px solid var(--shq-border)',
              background: accent,
            }}
            title="Choose a custom colour"
          >
            <input
              type="color"
              value={accent}
              onChange={(e) => handleAccentChange(e.target.value)}
              style={{
                position: 'absolute',
                inset: -6,
                width: 52,
                height: 52,
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            />
          </label>
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--shq-ink-muted)' }}>
          Applied as the primary accent across your account.
        </p>
      </div>

      <div
        style={{
          background: 'var(--shq-surface)',
          border: '1px solid var(--shq-border)',
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>
          White-label branding
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--shq-ink-muted)' }}>
          Replace SellerHQ branding with your business's own name and logo
          across the app (sidebar, top bar and browser tab).
        </p>
        <Toggle
          checked={whiteLabel}
          onChange={handleWhiteLabelChange}
          label="White-label branding"
        />
        {whiteLabel && (
          <div style={{ marginTop: 16 }}>
            <label
              style={{
                display: 'block',
                marginBottom: 6,
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--shq-ink-muted)',
              }}
            >
              App name
            </label>
            <input
              type="text"
              value={appName}
              placeholder={currentBusiness.name}
              onChange={(e) => setAppName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--shq-border)',
                borderRadius: 8,
                fontSize: 14,
                background: 'var(--shq-surface)',
                color: 'var(--shq-ink)',
              }}
            />
            <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--shq-ink-muted)' }}>
              Shown instead of "SellerHQ". Uses your business logo where one is
              set.
            </p>
            <button
              type="button"
              className="secondary-button"
              style={{ marginTop: 12 }}
              onClick={handleAppNameSave}
            >
              Save app name
            </button>

            <div
              style={{
                marginTop: 20,
                padding: '16px',
                border: '1px solid var(--shq-border)',
                borderRadius: 8,
              }}
            >
              <Toggle
                checked={labelBranding}
                onChange={handleLabelBrandingChange}
                label="Branding on printed labels & QR codes"
              />
              <p
                style={{
                  margin: '10px 0 0',
                  fontSize: 12,
                  color: 'var(--shq-ink-muted)',
                }}
              >
                Include your business logo and name on printed product labels,
                QR code sheets and barcode prints.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BusinessCustomization
