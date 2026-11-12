import { lazy, Suspense } from 'react'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/layout/PageLoader'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { DashboardRedirect, RequireAuth, RequireGuest } from '@/features/auth/components/guards'
import type { DashboardKey } from '@/features/auth/types'

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'))
const SetPasswordPage = lazy(() => import('@/features/auth/pages/SetPasswordPage'))
const NoAccessPage = lazy(() => import('@/features/auth/pages/NoAccessPage'))
const NotFoundPage = lazy(() => import('@/components/layout/NotFoundPage'))
const RoleHomePage = lazy(() => import('@/features/dashboard/RoleHomePage'))

function Root() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </AuthProvider>
  )
}

const roleHome = (path: string, dashboard: DashboardKey) => ({ path, element: <RoleHomePage dashboard={dashboard} /> })

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      // Public (signed-out) screens
      {
        element: <RequireGuest />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/esqueci-senha', element: <ForgotPasswordPage /> },
        ],
      },
      // Arrive from e-mail links (session created from the link itself)
      { path: '/primeiro-acesso', element: <SetPasswordPage mode="first-access" /> },
      { path: '/redefinir-senha', element: <SetPasswordPage mode="reset" /> },
      { path: '/sem-acesso', element: <NoAccessPage /> },

      // Private area
      {
        element: <RequireAuth />,
        children: [
          { path: '/', element: <DashboardRedirect /> },
          {
            element: <AppShell />,
            children: [
              roleHome('/inicio', 'neoleader'),
              roleHome('/gestao', 'coordination'),
              roleHome('/direcao', 'direction'),
              roleHome('/professor', 'teacher'),
              roleHome('/neomentor', 'mentor'),
              roleHome('/secretaria', 'secretary'),
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
