type ToggleProps = {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
      <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--shq-ink)' }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: '44px',
          height: '24px',
          borderRadius: '12px',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          background: checked ? 'var(--shq-success)' : '#d1d5db',
          transition: 'background 0.2s ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '3px',
            left: checked ? '23px' : '3px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: 'var(--shq-surface)',
            transition: 'left 0.2s ease',
          }}
        />
      </button>
    </div>
  )
}

export default Toggle
