import { useState } from 'react'

import { useTeam } from '../context/TeamContext'
import type { BusinessRole } from '../types/business'

const PAGES = ['inventory', 'sales', 'expenses', 'listings', 'forecasts', 'reports', 'tax']

function TeamHub() {
  const {
    members,
    invites,
    permissions,
    loading,
    isOwner,
    inviteMember,
    removeMember,
    changeRole,
    updatePermissions,
  } = useTeam()

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<BusinessRole>('member')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')

  async function handleInvite() {
    if (!inviteEmail.trim() || seatsFull) return
    setError('')
    setInviting(true)

    try {
      await inviteMember(inviteEmail.trim().toLowerCase(), inviteRole)
      setInviteEmail('')
    } catch (inviteError) {
      console.error(inviteError)
      setError('Could not send invitation. The email may already be invited or a member.')
    } finally {
      setInviting(false)
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
  const pendingCount = invites.length + members.filter((m) => m.status === 'pending').length
  const usedSeats = activeCount + pendingCount
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

      {/* Invite form (owner only) */}
      {isOwner && (
        <div style={{ background: 'var(--shq-surface)', border: '1px solid var(--shq-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600' }}>Invite a team member</h3>
          {seatsFull ? (
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--shq-warning-bg)',
                border: '1px solid var(--shq-warning-border)',
                borderRadius: 8,
                fontSize: 13,
                color: 'var(--shq-warning)',
              }}
            >
              Team is full ({usedSeats}/{totalSeats} seats). Remove a member or upgrade to add more.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                style={{ flex: 1, minWidth: '240px', padding: '10px 12px', border: '1px solid var(--shq-border)', borderRadius: '8px', fontSize: '14px', background: 'var(--shq-bg)', color: 'var(--shq-ink)' }}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as BusinessRole)}
                style={{ padding: '10px 12px', border: '1px solid var(--shq-border)', borderRadius: '8px', fontSize: '14px', background: 'var(--shq-bg)', color: 'var(--shq-ink)' }}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button className="primary-button" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                {inviting ? 'Sending...' : 'Send invite'}
              </button>
            </div>
          )}
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
          {invites.map((invite) => (
            <div
              key={invite.id}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px', background: 'var(--shq-surface-muted)', borderRadius: '8px', border: '1px dashed var(--shq-border)', flexWrap: 'wrap' }}
            >
              <div>
                <div style={{ fontWeight: 500, fontSize: '13px' }}>{invite.email}</div>
                <div style={{ fontSize: '12px', color: 'var(--shq-ink-muted)' }}>
                  {invite.role === 'admin' ? 'Admin' : 'Member'} · invitation pending
                </div>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--shq-ink-faint)' }}>
                Expires {new Date(invite.expiresAt).toLocaleDateString()}
              </span>
            </div>
          ))}
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
