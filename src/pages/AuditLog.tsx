import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useToast } from '../hooks/useToast'

type AuditRow = {
  id: string
  action: string
  details: Record<string, unknown> | null
  created_at: string
  business_id: string | null
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    'product.created': 'Product created',
    'product.updated': 'Product updated',
    'product.deleted': 'Product deleted',
    'business.created': 'Business created',
  }
  return map[action] ?? action.replace(/\./g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function AuditLog() {
  const navigate = useNavigate()
  const { currentBusiness } = useBusiness()
  const { showToast } = useToast()
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (currentBusiness) {
        query = query.eq('business_id', currentBusiness.id)
      }

      const { data, error } = await query

      if (error) {
        showToast('Could not load audit log', 'error')
      } else {
        setRows((data as AuditRow[]) ?? [])
      }
      setLoading(false)
    }
    void load()
  }, [showToast, currentBusiness])

  return (
    <div className="inventory-page" style={{ maxWidth: 720 }}>
      <button
        type="button"
        className="text-button"
        style={{ marginBottom: 16 }}
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700 }}>
        Audit log
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--shq-ink-muted)' }}>
        {currentBusiness
          ? `Recent activity for ${currentBusiness.name}.`
          : 'Recent account activity.'}
      </p>

      {loading ? (
        <div className="inventory-loading" style={{ minHeight: 160 }}>
          <div className="inventory-spinner" />
        </div>
      ) : rows.length === 0 ? (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: 'var(--shq-ink-muted)',
            fontSize: 13,
          }}
        >
          No activity recorded yet.
        </div>
      ) : (
        <div
          style={{
            background: 'var(--shq-surface)',
            border: '1px solid var(--shq-border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {rows.map((row, index) => (
            <div
              key={row.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                padding: '14px 16px',
                borderBottom:
                  index < rows.length - 1 ? '1px solid var(--shq-border)' : 'none',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {actionLabel(row.action)}
                </div>
                {row.details && (
                  <div style={{ fontSize: 12, color: 'var(--shq-ink-muted)', marginTop: 2 }}>
                    {Object.entries(row.details)
                      .map(([key, value]) => `${key}: ${String(value)}`)
                      .join(' · ')}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--shq-ink-faint)',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {new Date(row.created_at).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AuditLog
