import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageLoader } from '@/components/layout/PageLoader'
import { dashboardPath } from '@/config/dashboards'
import { useAuth } from '../hooks/useAuth'
import type { PermissionKey } from '../types'

const BLOCKED_STATUSES = new Set(['inactive', 'suspended'])

/** Private area: requires a session, an active account and a completed first access. */
export function RequireAuth() {
  const { initializing, session, user, loadingUser } = useAuth()
  const location = useLocation()

  if (initializing || loadingUser) return <PageLoader />
  if (!session) {
    const next = location.pathname + location.search
    return <Navigate to={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} replace />
  }
  if (!user) return <Navigate to="/sem-acesso" replace />
  if (BLOCKED_STATUSES.has(user.status)) return <Navigate to="/sem-acesso?motivo=status" replace />
  if (user.must_change_password && location.pathname !== '/primeiro-acesso') {
    return <Navigate to="/primeiro-acesso" replace />
  }
  return <Outlet />
}

/** Login & recovery screens: signed-in users go straight to their dashboard. */
export function RequireGuest() {
  const { initializing, session, user, loadingUser, isRecovery } = useAuth()
  if (initializing || (session && loadingUser)) return <PageLoader />
  if (session && user && !isRecovery) return <Navigate to={dashboardPath(user.dashboard)} replace />
  return <Outlet />
}

/** Route-level permission check (UX); the database enforces the same rule. */
export function RequirePermission({ permission }: { permission: PermissionKey | PermissionKey[] }) {
  const { hasPermission } = useAuth()
  const allowed = Array.isArray(permission) ? permission.some(hasPermission) : hasPermission(permission)
  return allowed ? <Outlet /> : <Navigate to="/sem-acesso" replace />
}

/** "/" → the dashboard of the user's primary role. */
export function DashboardRedirect() {
  const { user } = useAuth()
  return <Navigate to={dashboardPath(user?.dashboard)} replace />
}
