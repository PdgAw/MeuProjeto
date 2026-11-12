import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { CardSkeleton } from '@/components/shared/SectionCard'
import { initials } from '@/lib/utils'
import { useSubjectResults, type SubjectDetail } from '../../api'

/** Teachers for everyone; the Neoleader roster only for teachers and staff (RLS + RPC check). */
export function ParticipantsTab({ subject, canSeeRoster }: { subject: SubjectDetail; canSeeRoster: boolean }) {
  const roster = useSubjectResults(subject.id, canSeeRoster)
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-sm font-semibold">Professores</h3>
        <div className="flex flex-wrap gap-3">
          {subject.subject_teachers.map((t) => t.teacher && (
            <Link key={t.teacher.id} to={`/professores/${t.teacher.id}`} className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 hover:bg-secondary/50">
              <Avatar className="h-7 w-7">{t.teacher.avatar_url && <AvatarImage src={t.teacher.avatar_url} alt="" />}<AvatarFallback className="text-[10px]">{initials(t.teacher.full_name)}</AvatarFallback></Avatar>
              <span className="text-sm">{t.teacher.full_name}</span>
            </Link>
          ))}
        </div>
      </section>
      {canSeeRoster ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold">Neoleaders ({roster.data?.length ?? 0})</h3>
          {roster.isPending ? <CardSkeleton /> : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {roster.data?.map((r) => (
                <li key={r.user_id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  <Avatar className="h-9 w-9">{r.avatar_url && <AvatarImage src={r.avatar_url} alt="" />}<AvatarFallback>{initials(r.full_name)}</AvatarFallback></Avatar>
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{r.full_name}</p><p className="text-xs text-muted-foreground">{r.cohort_name}</p></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Turmas: {subject.subject_cohorts.map((c) => c.cohort?.name).join(', ')}. Conheça os colegas na <Link to="/comunidade" className="text-primary hover:underline">Comunidade Neo</Link>.
        </p>
      )}
      {!canSeeRoster && <Badge variant="outline">A lista completa é visível para professores e coordenação.</Badge>}
    </div>
  )
}
