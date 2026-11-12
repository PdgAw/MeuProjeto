import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { PageLoader } from '@/components/layout/PageLoader'

/*
 * Routes are lazy-loaded per module so each area of the platform ships as its own chunk.
 * Auth guards and role-based dashboards are added in Phase 2.
 */
const FoundationPage = lazy(() => import('@/features/foundation/FoundationPage'))
const NotFoundPage = lazy(() => import('@/components/layout/NotFoundPage'))

const router = createBrowserRouter([
  { path: '/', element: <FoundationPage /> },
  { path: '*', element: <NotFoundPage /> },
])

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RouterProvider router={router} />
    </Suspense>
  )
}
