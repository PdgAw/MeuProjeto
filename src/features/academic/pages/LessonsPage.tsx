import { addDays, addWeeks, format, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useLessonsInRange, useTeacherLessons } from '../api'
import { LessonList } from '../components/LessonList'

/** "Minhas aulas" (teacher) or "Aulas" (management), week by week. */
export default function LessonsPage({ scope }: { scope: 'teacher' | 'all' }) {
  const { user } = useAuth()
  const [offset, setOffset] = useState(0)
  const range = useMemo(() => {
    const from = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), offset)
    return { from, to: addDays(from, 7) }
  }, [offset])
  const teacher = useTeacherLessons(scope === 'teacher' ? user?.user_id : undefined, range)
  const all = useLessonsInRange(range)
  const q = scope === 'teacher' ? teacher : all

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{scope === 'teacher' ? 'Minhas aulas' : 'Aulas'}</h1>
          <p className="mt-1 text-muted-foreground">
            Semana de {format(range.from, "dd 'de' MMM", { locale: ptBR })} a {format(addDays(range.from, 6), "dd 'de' MMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setOffset(offset - 1)} aria-label="Semana anterior"><ChevronLeft /></Button>
          <Button variant="outline" onClick={() => setOffset(0)} disabled={offset === 0}>Esta semana</Button>
          <Button variant="outline" size="icon" onClick={() => setOffset(offset + 1)} aria-label="Próxima semana"><ChevronRight /></Button>
        </div>
      </header>
      {q.isPending ? <CardSkeleton lines={4} /> : <LessonList lessons={q.data ?? []} />}
    </div>
  )
}
