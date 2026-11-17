import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'group border bg-popover text-popover-foreground shadow-2xl rounded-md font-sans',
          description: 'text-muted-foreground',
        },
      }}
    />
  )
}
