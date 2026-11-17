import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SignalWaves } from '@/components/brand/SignalWaves'
import { cn } from '@/lib/utils'

interface SectionCardProps {
  title: ReactNode
  icon?: ReactNode
  action?: { label: string; to: string }
  /** Free-form header control (e.g. a button opening a dialog). */
  extra?: ReactNode
  className?: string
  contentClassName?: string
  children: ReactNode
}

export function SectionCard({ title, icon, action, extra, className, contentClassName, children }: SectionCardProps) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-[15px] [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-primary">
          {icon}
          {title}
        </CardTitle>
        {extra}
        {action && (
          <Link to={action.to} className="flex shrink-0 items-center text-xs font-semibold text-primary hover:underline">
            {action.label} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </CardHeader>
      <CardContent className={cn('flex-1', contentClassName)}>{children}</CardContent>
    </Card>
  )
}

export function EmptyState({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center text-sm text-muted-foreground">
      {icon ? <span className="text-primary/80 [&>svg]:h-7 [&>svg]:w-7">{icon}</span> : <SignalWaves className="h-10 w-10 opacity-70" />}
      <span className="max-w-xs">{text}</span>
    </div>
  )
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-secondary" />
      ))}
    </div>
  )
}
