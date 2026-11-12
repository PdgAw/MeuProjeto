import { Logo } from '@/components/brand/Logo'

export function PageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Logo className="animate-pulse" />
    </div>
  )
}
