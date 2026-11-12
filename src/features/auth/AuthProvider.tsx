import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchUserContext, signOut as apiSignOut } from './api/auth'
import { AuthContext, USER_CONTEXT_KEY, type AuthState } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [isRecovery, setIsRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setInitializing(false)
    })
    // Keep the callback synchronous: calling Supabase inside it can deadlock the auth lock.
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
      if (event === 'SIGNED_OUT') {
        setIsRecovery(false)
        queryClient.clear()
      }
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const userId = session?.user.id
  const userQuery = useQuery({
    queryKey: [...USER_CONTEXT_KEY, userId],
    queryFn: fetchUserContext,
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  })

  // Record presence once per session (feeds "last seen" in management views).
  useEffect(() => {
    if (userId) void supabase.rpc('touch_last_seen')
  }, [userId])

  const user = userQuery.data ?? null
  const permissions = useMemo(() => new Set(user?.permissions ?? []), [user])
  const roles = useMemo(() => new Set(user?.roles.map((r) => r.key) ?? []), [user])

  const refreshUser = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: USER_CONTEXT_KEY })
  }, [queryClient])

  const signOut = useCallback(async () => {
    await apiSignOut()
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      initializing,
      session,
      user,
      loadingUser: Boolean(userId) && userQuery.isPending,
      isRecovery,
      // UX only: the database enforces the same rules through RLS.
      hasPermission: (p) => roles.has('super_admin') || permissions.has(p),
      hasRole: (r) => roles.has(r),
      refreshUser,
      signOut,
    }),
    [initializing, session, user, userId, userQuery.isPending, isRecovery, permissions, roles, refreshUser, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
