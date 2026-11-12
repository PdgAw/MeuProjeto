import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'group border bg-card text-card-foreground shadow-lg rounded-lg',
          description: 'text-muted-foreground',
        },
      }}
    />
  )
}
