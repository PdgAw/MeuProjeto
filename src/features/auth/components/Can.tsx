import type { ReactNode } from 'react'
import { usePermission } from '../hooks/useAuth'
import type { PermissionKey } from '../types'

interface CanProps {
  /** Renders children if the user has this permission (or any of the list). */
  permission: PermissionKey | PermissionKey[]
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Hides UI the user cannot use. This is convenience only — every action is
 * re-checked by Postgres RLS, so hiding a button is never the security boundary.
 */
export function Can({ permission, fallback = null, children }: CanProps) {
  return usePermission(permission) ? <>{children}</> : <>{fallback}</>
}
