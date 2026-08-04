import { useEffect, useState, type ReactNode } from 'react'

import type { Session, User } from '@supabase/supabase-js'

import { supabase } from '../lib/supabase'
import { AuthContext } from '../hooks/useAuth'

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] =
    useState<Session | null>(null)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!mounted) return

        setSession(session)
        setUser(session?.user ?? null)
      } catch (err) {
        console.error('Failed to load session:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      },
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function signUp(
    email: string,
    password: string,
    fullName: string,
  ) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    return { error }
  }

  async function signIn(
    email: string,
    password: string,
  ) {
    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    return { error }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()

    return { error }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}


