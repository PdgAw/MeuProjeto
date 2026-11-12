import { LogOut } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { initials } from '@/lib/utils'

export function UserMenu() {
  const { user, signOut } = useAuth()
  if (!user) return null
  const roleName = user.roles[0]?.name ?? ''
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="hidden text-right md:block">
        <p className="text-sm font-medium leading-tight">{user.preferred_name || user.full_name}</p>
        <p className="text-xs text-muted-foreground">{roleName}{user.cohort ? ` · ${user.cohort.name}` : ''}</p>
      </div>
      <Avatar className="h-9 w-9">
        {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
        <AvatarFallback>{initials(user.full_name)}</AvatarFallback>
      </Avatar>
      <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Sair" title="Sair">
        <LogOut />
      </Button>
    </div>
  )
}
