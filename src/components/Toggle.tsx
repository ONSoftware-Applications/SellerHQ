type ToggleProps = {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  hideLabel?: boolean
}

function Toggle({ checked, onChange, label, hideLabel = false }: ToggleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
      {!hideLabel && (
        <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--shq-ink)' }}>{label}</span>
      )}
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: '44px',
          minWidth: '44px',
          height: '24px',
          minHeight: '24px',
          padding: 0,
          boxSizing: 'border-box',
          overflow: 'hidden',
          borderRadius: '12px',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          display: 'inline-block',
          lineHeight: 0,
          appearance: 'none',
          background: checked ? 'var(--shq-success)' : '#d1d5db',
          transition: 'background 0.2s ease',
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '3px',
            display: 'block',
            width: '18px',
            height: '18px',
            margin: 0,
            padding: 0,
            borderRadius: '50%',
            background: 'var(--shq-surface)',
            lineHeight: 0,
            transform: checked ? 'translate(20px, -50%)' : 'translate(0, -50%)',
            transition: 'transform 0.2s ease',
            pointerEvents: 'none',
          }}
        />
      </button>
    </div>
  )
}

export default Toggle
