import type { DashboardKey } from '@/features/auth/types'

/** Where each primary role lands after login. */
export const DASHBOARD_ROUTES: Record<DashboardKey, string> = {
  neoleader: '/inicio',
  coordination: '/gestao',
  direction: '/direcao',
  teacher: '/professor',
  mentor: '/neomentor',
  secretary: '/secretaria',
  staff: '/gestao',
}

export function dashboardPath(key: DashboardKey | null | undefined) {
  return DASHBOARD_ROUTES[key ?? 'neoleader'] ?? '/inicio'
}
