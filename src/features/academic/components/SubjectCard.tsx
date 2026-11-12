import { BookOpen, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { subjectProgress, type SubjectCard as Subject } from '../api'

const STATUS: Record<Subject['status'], { label: string; variant: 'success' | 'secondary' | 'default' | 'outline' }> = {
  active: { label: 'Em andamento', variant: 'default' },
  draft: { label: 'Rascunho', variant: 'outline' },
  completed: { label: 'Concluída', variant: 'success' },
  archived: { label: 'Arquivada', variant: 'secondary' },
}

export function SubjectCard({ subject: s, cohortId }: { subject: Subject; cohortId?: string | null }) {
  const progress = subjectProgress(s, cohortId)
  const lead = s.subject_teachers.find((t) => t.role === 'lead')?.teacher ?? s.subject_teachers[0]?.teacher
  return (
    <Link to={`/disciplinas/${s.id}`} className="group">
      <Card className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-md">
        <div className="relative h-24 bg-sidebar">
          {s.cover_url ? (
            <img src={s.cover_url} alt="" className="h-full w-full object-cover opacity-80" />
          ) : (
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--primary)/0.55),transparent_60%)]" />
          )}
          <span className="absolute left-4 top-3 font-mono text-[11px] font-semibold tracking-wider text-accent">{s.code}</span>
          <BookOpen className="absolute bottom-3 right-4 h-5 w-5 text-white/60" />
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display font-semibold leading-snug">{s.name}</p>
            <Badge variant={STATUS[s.status].variant} className="shrink-0">{STATUS[s.status].label}</Badge>
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
          <div className="mt-auto space-y-2 pt-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span className="truncate">{lead ? `Prof. ${lead.full_name}` : 'Professor a definir'}</span>
              {s.workload_hours && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{Number(s.workload_hours)}h</span>}
            </div>
            {progress.total > 0 && (
              <div className="space-y-1">
                <Progress value={progress.percent} className="h-1.5" />
                <p>{progress.done} de {progress.total} aulas</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}
