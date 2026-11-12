import type { ReactNode } from 'react'
import { Label } from './label'

interface FormFieldProps {
  id: string
  label: ReactNode
  error?: string
  hint?: ReactNode
  action?: ReactNode
  children: ReactNode
}

/** Label + control + error message, with aria wiring kept in one place. */
export function FormField({ id, label, error, hint, action, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
