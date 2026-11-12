import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useUnreadNotifications } from '@/features/notifications/api'
import { UserMenu } from './UserMenu'

export function TopBar() {
  const { user } = useAuth()
  const unread = useUnreadNotifications(user?.user_id)
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <Logo className="lg:hidden" />
        <div className="hidden lg:block" />
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" asChild className="relative">
            <Link to="/notificacoes" aria-label={`Notificações${unread ? ` (${unread} não lidas)` : ''}`}>
              <Bell />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
          </Button>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
