import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  /** Context line in brand eyebrow style ("MINHA JORNADA", "GESTÃO · ADMISSÕES"). */
  eyebrow?: ReactNode
  /** Page title; wrap one key word in <Highlight> for the brand's cyan accent. */
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

/** Standard page header from the brand manual: eyebrow, Sora title, supporting line, actions. */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0 space-y-2">
        {eyebrow && <p className="eyebrow flex items-center gap-2">{eyebrow}</p>}
        <h1 className="text-[1.75rem] font-bold leading-[1.15] sm:text-[2rem]">{title}</h1>
        {description && <p className="max-w-2xl text-[15px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/** One highlighted word in a title, as on neolevel.com.br ("de **líderes** está"). */
export function Highlight({ children }: { children: ReactNode }) {
  return <span className="text-primary">{children}</span>
}
