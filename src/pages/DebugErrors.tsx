import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { loadErrorLog, clearErrorLog } from '../lib/errorLog'

function DebugErrors() {
  const navigate = useNavigate()
  const [errors, setErrors] = useState(() => loadErrorLog())

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
      <button
        type="button"
        className="text-button"
        style={{ marginBottom: 16 }}
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Error Log</h1>
        {errors.length > 0 && (
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              clearErrorLog()
              setErrors([])
            }}
          >
            Clear
          </button>
        )}
      </div>

      {errors.length === 0 ? (
        <p style={{ color: 'var(--shq-ink-muted)' }}>No errors captured.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {errors.map((err, i) => (
            <div
              key={i}
              style={{
                background: 'var(--shq-surface)',
                border: '1px solid var(--shq-border)',
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--shq-error)', marginBottom: 4 }}>
                {err.message}
              </div>
              {err.source && (
                <div style={{ fontSize: 12, color: 'var(--shq-ink-muted)', marginBottom: 4 }}>
                  Source: {err.source}
                </div>
              )}
              {err.stack && (
                <pre
                  style={{
                    fontSize: 11,
                    color: 'var(--shq-ink-faint)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    margin: 0,
                    padding: 8,
                    background: 'var(--shq-bg)',
                    borderRadius: 8,
                    overflow: 'auto',
                    maxHeight: 150,
                  }}
                >
                  {err.stack}
                </pre>
              )}
              <div style={{ fontSize: 11, color: 'var(--shq-ink-faint)', marginTop: 6 }}>
                {new Date(err.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DebugErrors
