import { lazy, Suspense } from 'react'
import { createBrowserRouter, Outlet, RouterProvider, type RouteObject } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/layout/PageLoader'
import { allNavItems } from '@/config/navigation'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { DashboardRedirect, RequireAuth, RequireGuest } from '@/features/auth/components/guards'
import type { DashboardKey } from '@/features/auth/types'

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'))
const SetPasswordPage = lazy(() => import('@/features/auth/pages/SetPasswordPage'))
const NoAccessPage = lazy(() => import('@/features/auth/pages/NoAccessPage'))
const NotFoundPage = lazy(() => import('@/components/layout/NotFoundPage'))
const ComingSoonPage = lazy(() => import('@/components/layout/ComingSoonPage'))
const RoleHomePage = lazy(() => import('@/features/dashboard/RoleHomePage'))
const NeoleaderDashboardPage = lazy(() => import('@/features/dashboard/neoleader/NeoleaderDashboardPage'))
const JourneyPage = lazy(() => import('@/features/journey/pages/JourneyPage'))
const TodayPage = lazy(() => import('@/features/today/TodayPage'))

function Root() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </AuthProvider>
  )
}

/** Modules delivered in this phase; every other menu entry gets an "em construção" page. */
const BUILT: RouteObject[] = [
  { path: '/inicio', element: <NeoleaderDashboardPage /> },
  { path: '/jornada', element: <JourneyPage /> },
  { path: '/hoje', element: <TodayPage /> },
  ...(['coordination', 'direction', 'teacher', 'mentor', 'secretary'] as DashboardKey[]).map((d) => ({
    path: { coordination: '/gestao', direction: '/direcao', teacher: '/professor', mentor: '/neomentor', secretary: '/secretaria' }[d as Exclude<DashboardKey, 'neoleader' | 'staff'>],
    element: <RoleHomePage dashboard={d} />,
  })),
]
const builtPaths = new Set(BUILT.map((r) => r.path))
const PHASE_BY_PREFIX: [RegExp, string][] = [
  [/disciplinas|aulas|turmas|professores/, 'Fase 4'],
  [/mentoria|neomentor|meu-negocio|projetos/, 'Fase 5'],
  [/bancas|experiencias|comunidade|conquistas|perfil/, 'Fase 6'],
  [/chat|comunicados|documentos|agenda|notificacoes/, 'Fase 7'],
  [/gestao|solicitacoes/, 'Fase 8'],
]
const placeholders: RouteObject[] = [...allNavItems(), { key: 'notifications', label: 'Notificações', path: '/notificacoes' }]
  .filter((i) => !builtPaths.has(i.path))
  .map((i) => ({
    path: i.path,
    element: <ComingSoonPage title={i.label} phase={PHASE_BY_PREFIX.find(([re]) => re.test(i.path))?.[1]} />,
  }))

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <RequireGuest />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/esqueci-senha', element: <ForgotPasswordPage /> },
        ],
      },
      { path: '/primeiro-acesso', element: <SetPasswordPage mode="first-access" /> },
      { path: '/redefinir-senha', element: <SetPasswordPage mode="reset" /> },
      { path: '/sem-acesso', element: <NoAccessPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: '/', element: <DashboardRedirect /> },
          { element: <AppShell />, children: [...BUILT, ...placeholders] },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
