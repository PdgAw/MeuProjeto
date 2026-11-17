import { SignalWaves } from '@/components/brand/SignalWaves'

export function PageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background" role="status" aria-label="Carregando">
      <SignalWaves className="h-14 w-14 animate-pulse" />
    </div>
  )
}
