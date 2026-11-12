import { useContext } from 'react'
import { AuthContext } from '../context'
import type { PermissionKey } from '../types'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** True when the signed-in user holds the permission (or any of them, when given a list). */
export function usePermission(permission: PermissionKey | PermissionKey[]) {
  const { hasPermission } = useAuth()
  return Array.isArray(permission) ? permission.some(hasPermission) : hasPermission(permission)
}
