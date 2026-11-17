import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { cn } from '@/lib/utils'
import { useNavigation } from './useNavigation'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

/** Desktop sidebar — always navy (brand signature), collapsible to icons. */
export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const sections = useNavigation()
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      <div className={cn('flex h-[72px] items-center', collapsed ? 'justify-center' : 'px-6')}>
        {collapsed ? <Logo variant="symbol" className="h-6" /> : <Logo withCaption variant="negative" className="[&>img]:h-7" />}
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4 pt-2" aria-label="Navegação principal">
        {sections.map((section, i) => (
          <div key={section.title ?? i} className="space-y-0.5">
            {section.title && !collapsed && (
              <p className="px-3 pb-2 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-muted">{section.title}</p>
            )}
            {section.items.map(({ key, label, path, icon: Icon }) => (
              <NavLink
                key={key}
                to={path}
                end={key === 'home'}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    'relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                    collapsed && 'justify-center px-0',
                    isActive
                      ? 'bg-sidebar-accent text-white before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-full before:bg-neo'
                      : 'text-sidebar-foreground/75 hover:bg-white/5 hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-neo')} />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <button
        onClick={onToggle}
        className="flex h-12 items-center justify-center gap-2 border-t border-sidebar-border text-xs font-medium text-sidebar-muted transition-colors hover:text-white"
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Recolher</>}
      </button>
    </aside>
  )
}
