import { Outlet } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { UserMenu } from './UserMenu'

/** Signed-in shell. Phase 3 replaces this top bar with the role-aware sidebar + mobile bottom nav. */
export function AppShell() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <UserMenu />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
