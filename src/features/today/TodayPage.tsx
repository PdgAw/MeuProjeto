import { useAuth } from '@/features/auth/hooks/useAuth'
import { PendingCard } from '@/features/dashboard/neoleader/PendingCard'
import { TodayCard } from '@/features/dashboard/neoleader/TodayCard'
import { fmtDateLong } from '@/lib/format'

export default function TodayPage() {
  const { user } = useAuth()
  if (!user) return null
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">Hoje</h1>
        <p className="mt-1 first-letter:uppercase text-muted-foreground">{fmtDateLong(new Date())}</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem] [&>*]:min-w-0">
        <TodayCard userId={user.user_id} />
        <PendingCard userId={user.user_id} />
      </div>
    </div>
  )
}
