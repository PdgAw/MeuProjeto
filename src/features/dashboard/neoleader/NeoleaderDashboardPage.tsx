import { addDays, startOfDay } from 'date-fns'
import { useMemo } from 'react'
import { useAgenda } from '@/features/agenda/api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { firstName, greeting } from '@/lib/utils'
import { AnnouncementsCard } from './AnnouncementsCard'
import { JourneyCard } from './JourneyCard'
import { NeoProgressCard } from './NeoProgressCard'
import { NextUpTiles } from './NextUpTiles'
import { PendingCard } from './PendingCard'
import { TodayCard } from './TodayCard'
import { VentureCard } from './VentureCard'
import { WeekCard } from './WeekCard'

export default function NeoleaderDashboardPage() {
  const { user } = useAuth()
  const range = useMemo(() => {
    const from = startOfDay(new Date())
    return { from, to: addDays(from, 8) }
  }, [])
  const week = useAgenda(range.from, range.to)
  if (!user) return null

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">{greeting()}, {firstName(user.preferred_name || user.full_name)}.</h1>
        <p className="mt-1 text-muted-foreground">Veja o que está acontecendo na sua jornada NeoLevel.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <TodayCard userId={user.user_id} />
          <NextUpTiles userId={user.user_id} week={week.data ?? []} />
          <div className="grid gap-6 md:grid-cols-2 [&>*]:min-w-0">
            <WeekCard items={week.data ?? []} loading={week.isPending} />
            <PendingCard userId={user.user_id} />
          </div>
        </div>
        <div className="min-w-0 space-y-6">
          <NeoProgressCard />
          <JourneyCard />
          <VentureCard userId={user.user_id} />
          <AnnouncementsCard userId={user.user_id} />
        </div>
      </div>
    </div>
  )
}
