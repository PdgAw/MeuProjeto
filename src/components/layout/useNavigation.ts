import { useMemo } from 'react'
import { navigationFor, type NavSection } from '@/config/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'

/** The menu for the signed-in user's primary role, filtered by permissions. */
export function useNavigation(): NavSection[] {
  const { user, hasPermission } = useAuth()
  return useMemo(() => {
    if (!user) return []
    return navigationFor(user.dashboard)
      .map((section) => ({
        ...section,
        items: section.items.filter((i) => !i.permissions || i.permissions.some(hasPermission)),
      }))
      .filter((s) => s.items.length > 0)
  }, [user, hasPermission])
}
