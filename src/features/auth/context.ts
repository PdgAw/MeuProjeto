import type { Session } from '@supabase/supabase-js'
import { createContext } from 'react'
import type { PermissionKey, UserContext } from './types'

export interface AuthState {
  /** True until the stored session has been read. */
  initializing: boolean
  session: Session | null
  /** Profile, roles, permissions, cohort — loaded from the database after login. */
  user: UserContext | null
  loadingUser: boolean
  /** Set when the user arrived from a password-recovery link. */
  isRecovery: boolean
  hasPermission: (permission: PermissionKey) => boolean
  hasRole: (roleKey: string) => boolean
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export const USER_CONTEXT_KEY = ['auth', 'user-context'] as const
