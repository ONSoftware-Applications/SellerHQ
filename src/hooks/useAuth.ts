import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{
    error: Error | null
  }>
  signIn: (
    email: string,
    password: string,
  ) => Promise<{
    error: Error | null
  }>
  signOut: () => Promise<{
    error: Error | null
  }>
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
)

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }

  return context
}
