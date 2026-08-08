import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { BusinessContext } from '../hooks/useBusiness'
import type { Business } from '../types/business'

export function BusinessProvider({
  children,
}: {
  children: ReactNode
}) {
  const { user, loading: authLoading } = useAuth()

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [currentBusiness, setCurrentBusiness] =
    useState<Business | null>(null)

  const [loading, setLoading] = useState(true)

  const refreshBusinesses = useCallback(async (): Promise<Business[]> => {
    if (!user) {
      setBusinesses([])
      setCurrentBusiness(null)
      setLoading(false)
      return []
    }

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*, business_members!inner(role)')
        .eq('business_members.user_id', user.id)
        .eq('business_members.status', 'active')
        .order('created_at', {
          ascending: true,
        })

      if (error) {
        console.error(
          'Failed to load businesses:',
          error,
        )

        setBusinesses([])
        setCurrentBusiness(null)
        return []
      }

      const loadedBusinesses = (data ?? []).map(({ business_members, ...business }) => ({
        ...business,
        memberRole: business_members?.[0]?.role ?? 'member',
      }))

      setBusinesses(loadedBusinesses)

      const savedBusinessId =
        localStorage.getItem('sellerhq_current_business')

      const savedBusiness = loadedBusinesses.find(
        (business) => business.id === savedBusinessId,
      )

      if (savedBusiness) {
        setCurrentBusiness(savedBusiness)
      } else {
        const firstBusiness = loadedBusinesses[0] ?? null

        setCurrentBusiness(firstBusiness)

        if (firstBusiness) {
          localStorage.setItem(
            'sellerhq_current_business',
            firstBusiness.id,
          )
        }
      }

      return loadedBusinesses
    } catch (err) {
      console.error('Failed to load businesses:', err)
      setBusinesses([])
      setCurrentBusiness(null)
      return []
    } finally {
      setLoading(false)
    }
  }, [user])

  function switchBusiness(businessId: string) {
    const business = businesses.find(
      (item) => item.id === businessId,
    )

    if (!business) {
      return
    }

    setCurrentBusiness(business)

    localStorage.setItem(
      'sellerhq_current_business',
      business.id,
    )
  }

  const joinWithCode = useCallback(
    async (code: string): Promise<{ success: boolean; businessId?: string; error?: string }> => {
      const trimmed = code.trim().toUpperCase()
      if (!trimmed) {
        return { success: false, error: 'Please enter an invite code.' }
      }

      const { data, error } = await supabase.rpc('accept_invite_code', {
        p_code: trimmed,
      })

      if (error || !data || data.length === 0) {
        return {
          success: false,
          error: error?.message ?? 'Could not join the business. The code may be invalid or expired.',
        }
      }

      const joined = (data as Array<{ business_id: string }>) [0]
      const businessId = joined.business_id

      const refreshed = await refreshBusinesses()
      const target = refreshed.find((b) => b.id === businessId)

      if (target) {
        setCurrentBusiness(target)
        localStorage.setItem('sellerhq_current_business', target.id)
      }

      return { success: true, businessId }
    },
    [refreshBusinesses],
  )

  useEffect(() => {
    if (authLoading) {
      return
    }

    refreshBusinesses()
  }, [user, authLoading, refreshBusinesses])

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        currentBusiness,
        loading: authLoading || loading,
        refreshBusinesses,
        switchBusiness,
        joinWithCode,
      }}
    >
      {children}
    </BusinessContext.Provider>
  )
}


