import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { cn } from '@/lib/utils'
import { useNavigation } from './useNavigation'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

/** Desktop sidebar — fixed, collapsible to icons. */
export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const sections = useNavigation()
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      <div className={cn('flex h-16 items-center', collapsed ? 'justify-center' : 'px-5')}>
        {collapsed ? <Logo className="[&>div]:hidden" tone="light" /> : <Logo withCaption tone="light" />}
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Navegação principal">
        {sections.map((section, i) => (
          <div key={section.title ?? i} className="space-y-1">
            {section.title && !collapsed && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">{section.title}</p>
            )}
            {section.items.map(({ key, label, path, icon: Icon }) => (
              <NavLink
                key={key}
                to={path}
                end={key === 'home'}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    collapsed && 'justify-center px-0',
                    isActive
                      ? 'bg-sidebar-accent text-white'
                      : 'text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-accent')} />
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
        className="flex h-12 items-center justify-center gap-2 border-t border-sidebar-border text-xs text-sidebar-muted hover:text-sidebar-foreground"
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Recolher</>}
      </button>
    </aside>
  )
}
