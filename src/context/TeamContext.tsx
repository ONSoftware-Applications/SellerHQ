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

export type TeamInviteCode = {
  id: string
  role: BusinessRole
  code: string
  expiresAt: string
  createdAt: string
}

export type TeamContextType = {
  members: TeamMember[]
  inviteCodes: Record<string, TeamInviteCode | null>
  permissions: Record<string, PagePermission[]>
  loading: boolean
  isOwner: boolean
  isAdminOrOwner: boolean
  canUse: (page: string, action: 'view' | 'edit' | 'delete') => boolean
  refresh: () => Promise<void>
  generateInviteCode: (role: BusinessRole) => Promise<void>
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
  const [inviteCodes, setInviteCodes] = useState<
    Record<string, TeamInviteCode | null>
  >({ admin: null, member: null })
  const [permissions, setPermissions] = useState<Record<string, PagePermission[]>>({})
  const [loading, setLoading] = useState(true)

  const isOwner = currentBusiness?.memberRole === 'owner'
  const isAdminOrOwner = isOwner || currentBusiness?.memberRole === 'admin'

  const refresh = useCallback(async () => {
    if (!currentBusiness) {
      setMembers([])
      setInviteCodes({ admin: null, member: null })
      setPermissions({})
      setLoading(false)
      return
    }

    setLoading(true)

    const [membersResult, codesResult, permissionsResult] = await Promise.all([
      supabase
        .from('business_members')
        .select('id, user_id, email, role, status, invited_at, joined_at')
        .eq('business_id', currentBusiness.id)
        .neq('status', 'removed')
        .order('invited_at', { ascending: false }),

      supabase
        .from('business_invite_codes')
        .select('id, role, code, expires_at, created_at')
        .eq('business_id', currentBusiness.id),

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

    if (codesResult.error) {
      console.error('Failed to load invite codes:', codesResult.error)
    } else {
      const codes: Record<string, TeamInviteCode | null> = {
        admin: null,
        member: null,
      }
      for (const row of codesResult.data ?? []) {
        codes[row.role as BusinessRole] = {
          id: row.id,
          role: row.role as BusinessRole,
          code: row.code,
          expiresAt: row.expires_at,
          createdAt: row.created_at,
        }
      }
      setInviteCodes(codes)
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

  const generateInviteCode = useCallback(
    async (role: BusinessRole) => {
      if (!currentBusiness) return

      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      let code = ''
      const bytes = crypto.getRandomValues(new Uint8Array(8))
      for (let i = 0; i < 8; i++) {
        code += chars[bytes[i] % chars.length]
      }

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      const { error } = await supabase.from('business_invite_codes').upsert(
        {
          business_id: currentBusiness.id,
          role,
          code,
          expires_at: expiresAt.toISOString(),
          created_by: (await supabase.auth.getUser()).data.user?.id,
        },
        { onConflict: 'business_id, role' },
      )

      if (error) {
        console.error('Failed to generate invite code:', error)
        throw error
      }

      await refresh()
    },
    [currentBusiness, refresh],
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
      inviteCodes,
      permissions,
      loading,
      isOwner,
      isAdminOrOwner,
      canUse,
      refresh,
      generateInviteCode,
      removeMember,
      changeRole,
      updatePermissions,
    }),
    [
      members,
      inviteCodes,
      permissions,
      loading,
      isOwner,
      isAdminOrOwner,
      canUse,
      refresh,
      generateInviteCode,
      removeMember,
      changeRole,
      updatePermissions,
    ],
  )

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  )
}
