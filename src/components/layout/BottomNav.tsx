import { Menu } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useNavigation } from './useNavigation'

/** Mobile bottom bar: up to 4 primary destinations + "Mais" sheet with the rest. */
export function BottomNav() {
  const sections = useNavigation()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const all = sections.flatMap((s) => s.items)
  const primary = all.filter((i) => i.mobile).slice(0, 4)
  const rest = all.filter((i) => !primary.includes(i))
  const restActive = rest.some((i) => location.pathname.startsWith(i.path))

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar/95 pb-[env(safe-area-inset-bottom)] text-sidebar-foreground backdrop-blur-md lg:hidden"
      aria-label="Navegação"
    >
      <div className="grid grid-cols-5">
        {primary.map(({ key, label, short, path, icon: Icon }) => (
          <NavLink
            key={key}
            to={path}
            end={key === 'home'}
            className={({ isActive }) =>
              cn('relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors', isActive ? 'text-neo before:absolute before:inset-x-6 before:top-0 before:h-0.5 before:rounded-full before:bg-neo' : 'text-sidebar-foreground/70')
            }
          >
            <Icon className="h-5 w-5" />
            <span className="max-w-full truncate px-1">{short ?? label}</span>
          </NavLink>
        ))}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className={cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium', restActive ? 'text-neo' : 'text-sidebar-foreground/70')}
          >
            <Menu className="h-5 w-5" />
            Mais
          </SheetTrigger>
          <SheetContent side="bottom" title="Mais opções" className="px-4 pb-6 pt-5">
            <p className="eyebrow mb-4">Mais destinos</p>
            <div className="grid grid-cols-3 gap-2">
              {rest.map(({ key, label, path, icon: Icon }) => (
                <NavLink
                  key={key}
                  to={path}
                  end={key === 'home'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-2 rounded-md border bg-secondary/40 p-3 text-center text-xs font-medium transition-colors',
                      isActive ? 'border-primary bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary',
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </NavLink>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
