type EmptyStateProps = {
  icon?: string
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

function EmptyState({ icon = '📦', title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        minHeight: '240px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        textAlign: 'center',
        gap: '8px',
        padding: '32px 20px',
      }}
    >
      <div style={{ fontSize: '34px', marginBottom: '4px' }}>{icon}</div>
      <strong style={{ fontSize: '14px', color: 'var(--shq-ink)' }}>{title}</strong>
      {description && (
        <span
          style={{
            maxWidth: '420px',
            color: 'var(--shq-ink-faint)',
            fontSize: '12px',
            lineHeight: '1.5',
          }}
        >
          {description}
        </span>
      )}
      {action && (
        <button
          className="btn btn-primary"
          onClick={action.onClick}
          style={{ marginTop: '10px' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export default EmptyState