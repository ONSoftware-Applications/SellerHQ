import { useState } from 'react'

import { useTeam } from '../context/TeamContext'
import { useToast } from '../hooks/useToast'
import type { BusinessRole } from '../types/business'

const PAGES = ['inventory', 'sales', 'expenses', 'listings', 'forecasts', 'reports', 'tax']

const ROLES: { value: BusinessRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
]

function TeamHub() {
  const {
    members,
    inviteCodes,
    permissions,
    loading,
    isOwner,
    generateInviteCode,
    removeMember,
    changeRole,
    updatePermissions,
  } = useTeam()
  const { showToast } = useToast()

  const [generating, setGenerating] = useState<BusinessRole | null>(null)
  const [error, setError] = useState('')

  async function handleGenerateCode(role: BusinessRole) {
    setError('')
    setGenerating(role)
    try {
      await generateInviteCode(role)
      showToast(`New ${role} invite code generated.`, 'success')
    } catch (genError) {
      console.error(genError)
      setError('Could not generate the invite code. Please try again.')
    } finally {
      setGenerating(null)
    }
  }

  function handlePermissionChange(role: string, page: string, field: 'canView' | 'canEdit' | 'canDelete', value: boolean) {
    const rolePerms = permissions[role] ?? []
    const existing = rolePerms.find((p) => p.page === page)
    const updated = existing
      ? rolePerms.map((p) => (p.page === page ? { ...p, [field]: value } : p))
      : [...rolePerms, { page, canView: true, canEdit: true, canDelete: false, [field]: value }]
    void updatePermissions(role, updated)
  }

  if (loading) {
    return (
      <div className="inventory-page">
        <div className="inventory-loading" style={{ minHeight: '40vh' }}>
          <div className="inventory-spinner" />
        </div>
      </div>
    )
  }

  const totalSeats = 5
  const activeCount = members.filter((m) => m.status === 'active').length
  const usedSeats = activeCount
  const seatsFull = usedSeats >= totalSeats

  return (
    <div className="inventory-page">
      <div className="page-heading">
        <div>
          <h1>Team</h1>
          <p>Manage who can access this business and what they can do.</p>
        </div>
      </div>

      {error && <div className="inventory-alert">{error}</div>}

      {/* Seats */}
      <div className="inventory-stat" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span>Team seats</span>
          <strong>{usedSeats} / {totalSeats} used</strong>
        </div>
      </div>

      {/* Invite codes (owner only) */}
      {isOwner && (
        <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '600' }}>Invite codes</h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--shq-ink-muted)' }}>
            Share a code to add someone to the team. Each code is reusable and joins people as the role shown below. Codes expire after 30 days or whenever you generate a new one. Members enter the code in the business selector.
          </p>

          {seatsFull && (
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--shq-warning-bg)',
                border: '1px solid var(--shq-warning-border)',
                borderRadius: 8,
                fontSize: 13,
                color: 'var(--shq-warning)',
                marginBottom: '12px',
              }}
            >
              Team is full ({usedSeats}/{totalSeats} seats). Remove a member before generating new codes.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ROLES.map(({ value: role, label }) => {
              const code = inviteCodes[role]
              const generatingThis = generating === role

              return (
                <div
                  key={role}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}
                >
                  <span style={{ fontSize: '13px', fontWeight: '600', minWidth: '56px' }}>{label}:</span>
                  {code ? (
                    <>
                      <code
                        style={{
                          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                          fontSize: '15px',
                          background: 'var(--shq-surface-muted)',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--shq-border)',
                          wordBreak: 'break-all',
                        }}
                        title={code.code}
                      >
                        {code.code}
                      </code>
                      <span style={{ fontSize: '11px', color: 'var(--shq-ink-muted)' }}>
                        expires {new Date(code.expiresAt).toLocaleDateString()}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--shq-ink-muted)' }}>
                      No code yet
                    </span>
                  )}
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleGenerateCode(role)}
                    disabled={generatingThis || seatsFull}
                    style={{ padding: '8px 14px', fontSize: '12px' }}
                  >
                    {generatingThis ? 'Generating…' : code ? 'Regenerate' : 'Generate code'}
                  </button>
                </div>
              )
            })}
          </div>

          <p style={{ margin: '12px 0 0', fontSize: '11px', color: 'var(--shq-ink-muted)' }}>
            Copy a code and share it with the person you want to add. They enter it in the business selector (under "Add another business").
          </p>
        </div>
      )}

      {/* Members list */}
      <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600' }}>Members</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {members.map((member) => (
            <div
              key={member.id}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px', background: 'var(--shq-bg)', borderRadius: '8px', flexWrap: 'wrap' }}
            >
              <div style={{ minWidth: '0' }}>
                <div style={{ fontWeight: 500, fontSize: '13px' }}>{member.email}</div>
                <div style={{ fontSize: '12px', color: 'var(--shq-ink-muted)' }}>
                  {member.role === 'owner' ? 'Owner' : member.role === 'admin' ? 'Admin' : 'Member'}
                  {member.status === 'pending' && ' · pending'}
                </div>
              </div>
              {isOwner && member.role !== 'owner' && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={member.role}
                    onChange={(e) => void changeRole(member.id, e.target.value as BusinessRole)}
                    disabled={member.status === 'pending'}
                    style={{ padding: '6px 10px', border: '1px solid var(--shq-border)', borderRadius: '6px', fontSize: '12px', background: 'var(--shq-surface)', color: 'var(--shq-ink)' }}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button className="row-action-link" onClick={() => void removeMember(member.id)}>
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
          {members.length === 0 && (
            <div style={{ fontSize: '13px', color: 'var(--shq-ink-muted)' }}>No team members yet.</div>
          )}
        </div>
      </div>

      {/* Permissions matrix (owner only) */}
      {isOwner && (
        <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '600' }}>Page permissions</h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--shq-ink-muted)' }}>
            Control what each role can view and edit. Owner always has full access.
          </p>
          <div className="table-wrapper">
            <table className="inventory-table" style={{ minWidth: 0 }}>
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Admin</th>
                  <th>Member</th>
                </tr>
              </thead>
              <tbody>
                {PAGES.map((page) => {
                  const adminPerms = permissions['admin']?.find((p) => p.page === page)
                  const memberPerms = permissions['member']?.find((p) => p.page === page)

                  return (
                    <tr key={page}>
                      <td data-label="Page" style={{ textTransform: 'capitalize' }}>{page}</td>
                      <td data-label="Admin">
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                            <input type="checkbox" checked={adminPerms?.canView ?? true} onChange={(e) => handlePermissionChange('admin', page, 'canView', e.target.checked)} />
                            View
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                            <input type="checkbox" checked={adminPerms?.canEdit ?? true} onChange={(e) => handlePermissionChange('admin', page, 'canEdit', e.target.checked)} />
                            Edit
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                            <input type="checkbox" checked={adminPerms?.canDelete ?? false} onChange={(e) => handlePermissionChange('admin', page, 'canDelete', e.target.checked)} />
                            Delete
                          </label>
                        </div>
                      </td>
                      <td data-label="Member">
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                            <input type="checkbox" checked={memberPerms?.canView ?? true} onChange={(e) => handlePermissionChange('member', page, 'canView', e.target.checked)} />
                            View
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                            <input type="checkbox" checked={memberPerms?.canEdit ?? true} onChange={(e) => handlePermissionChange('member', page, 'canEdit', e.target.checked)} />
                            Edit
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                            <input type="checkbox" checked={memberPerms?.canDelete ?? false} onChange={(e) => handlePermissionChange('member', page, 'canDelete', e.target.checked)} />
                            Delete
                          </label>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamHub
