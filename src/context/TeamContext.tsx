import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createContext } from 'react'

import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import type { BusinessRole } from '../types/business'

export type TeamMember = {
  id: string
  userId: string
  email: string
  role: BusinessRole
  status: 'pending' | 'active'
  invitedAt: string
  joinedAt: string | null
}

export type PagePermission = {
  page: string
  canView: boolean
  canEdit: boolean
  canDelete: boolean
}

export type TeamInvite = {
  id: string
  email: string
  role: BusinessRole
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expiresAt: string
  createdAt: string
}

export type TeamContextType = {
  members: TeamMember[]
  invites: TeamInvite[]
  permissions: Record<string, PagePermission[]>
  loading: boolean
  isOwner: boolean
  isAdminOrOwner: boolean
  canUse: (page: string, action: 'view' | 'edit' | 'delete') => boolean
  refresh: () => Promise<void>
  inviteMember: (email: string, role: BusinessRole) => Promise<void>
  removeMember: (memberId: string) => Promise<void>
  changeRole: (memberId: string, role: BusinessRole) => Promise<void>
  updatePermissions: (role: string, permissions: PagePermission[]) => Promise<void>
}

const TeamContext = createContext<TeamContextType | undefined>(undefined)

export function useTeam() {
  const context = useContext(TeamContext)
  if (!context) {
    throw new Error('useTeam must be used inside a TeamProvider')
  }
  return context
}

export function TeamProvider({ children }: { children: ReactNode }) {
  const { currentBusiness } = useBusiness()

  const [members, setMembers] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [permissions, setPermissions] = useState<Record<string, PagePermission[]>>({})
  const [loading, setLoading] = useState(true)

  const isOwner = currentBusiness?.memberRole === 'owner'
  const isAdminOrOwner = isOwner || currentBusiness?.memberRole === 'admin'

  const refresh = useCallback(async () => {
    if (!currentBusiness) {
      setMembers([])
      setInvites([])
      setPermissions({})
      setLoading(false)
      return
    }

    setLoading(true)

    const [membersResult, invitesResult, permissionsResult] = await Promise.all([
      supabase
        .from('business_members')
        .select('id, user_id, email, role, status, invited_at, joined_at')
        .eq('business_id', currentBusiness.id)
        .neq('status', 'removed')
        .order('invited_at', { ascending: false }),

      supabase
        .from('business_invites')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),

      supabase
        .from('business_role_permissions')
        .select('*')
        .eq('business_id', currentBusiness.id),
    ])

    if (membersResult.error) {
      console.error('Failed to load team members:', membersResult.error)
    } else {
      setMembers(
        (membersResult.data ?? []).map((row) => ({
          id: row.id,
          userId: row.user_id,
          email: row.email,
          role: row.role as BusinessRole,
          status: row.status as 'pending' | 'active',
          invitedAt: row.invited_at,
          joinedAt: row.joined_at,
        })),
      )
    }

    if (invitesResult.error) {
      console.error('Failed to load invites:', invitesResult.error)
    } else {
      setInvites(
        (invitesResult.data ?? []).map((row) => ({
          id: row.id,
          email: row.email,
          role: row.role as BusinessRole,
          status: row.status as 'pending' | 'accepted' | 'expired' | 'revoked',
          expiresAt: row.expires_at,
          createdAt: row.created_at,
        })),
      )
    }

    if (permissionsResult.error) {
      console.error('Failed to load permissions:', permissionsResult.error)
    } else {
      const perms: Record<string, PagePermission[]> = {}
      for (const row of permissionsResult.data ?? []) {
        if (!perms[row.role]) perms[row.role] = []
        perms[row.role].push({
          page: row.page,
          canView: row.can_view,
          canEdit: row.can_edit,
          canDelete: row.can_delete,
        })
      }
      setPermissions(perms)
    }

    setLoading(false)
  }, [currentBusiness])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const canUse = useCallback(
    (page: string, action: 'view' | 'edit' | 'delete') => {
      if (isOwner) return true

      const role = currentBusiness?.memberRole
      if (!role) return false

      const rolePerms = permissions[role] ?? []
      const pagePerm = rolePerms.find((p) => p.page === page)
      if (!pagePerm) return false

      if (action === 'view') return pagePerm.canView
      if (action === 'edit') return pagePerm.canEdit
      if (action === 'delete') return pagePerm.canDelete
      return false
    },
    [permissions, isOwner, currentBusiness?.memberRole],
  )

  const inviteMember = useCallback(
    async (email: string, role: BusinessRole) => {
      if (!currentBusiness) return

      const maxSeats = 5
      const activeCount = members.filter((m) => m.status === 'active').length
      const pendingCount = invites.length + members.filter((m) => m.status === 'pending').length

      if (activeCount + pendingCount >= maxSeats) {
        throw new Error(`Team is full (${maxSeats}/${maxSeats} seats). Remove a member before inviting another.`)
      }

      const token = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { error } = await supabase.from('business_invites').insert({
        business_id: currentBusiness.id,
        email,
        role,
        token,
        invited_by: (await supabase.auth.getUser()).data.user?.id,
        expires_at: expiresAt.toISOString(),
      })

      if (error) {
        console.error('Failed to invite member:', error)
        throw error
      }

      await refresh()
    },
    [currentBusiness, members, invites, refresh],
  )

  const removeMember = useCallback(
    async (memberId: string) => {
      const { error } = await supabase
        .from('business_members')
        .update({ status: 'removed' })
        .eq('id', memberId)

      if (error) {
        console.error('Failed to remove member:', error)
        throw error
      }

      await refresh()
    },
    [refresh],
  )

  const changeRole = useCallback(
    async (memberId: string, role: BusinessRole) => {
      const { error } = await supabase
        .from('business_members')
        .update({ role })
        .eq('id', memberId)

      if (error) {
        console.error('Failed to change role:', error)
        throw error
      }

      await refresh()
    },
    [refresh],
  )

  const updatePermissions = useCallback(
    async (role: string, perms: PagePermission[]) => {
      if (!currentBusiness) return

      for (const perm of perms) {
        const { error } = await supabase
          .from('business_role_permissions')
          .upsert(
            {
              business_id: currentBusiness.id,
              role,
              page: perm.page,
              can_view: perm.canView,
              can_edit: perm.canEdit,
              can_delete: perm.canDelete,
            },
            { onConflict: 'business_id, role, page' },
          )

        if (error) {
          console.error('Failed to update permissions:', error)
          throw error
        }
      }

      await refresh()
    },
    [currentBusiness, refresh],
  )

  const value = useMemo<TeamContextType>(
    () => ({
      members,
      invites,
      permissions,
      loading,
      isOwner,
      isAdminOrOwner,
      canUse,
      refresh,
      inviteMember,
      removeMember,
      changeRole,
      updatePermissions,
    }),
    [members, invites, permissions, loading, isOwner, isAdminOrOwner, canUse, refresh, inviteMember, removeMember, changeRole, updatePermissions],
  )

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  )
}
