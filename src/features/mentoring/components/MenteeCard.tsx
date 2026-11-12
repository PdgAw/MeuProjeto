import { Briefcase, CalendarClock, History, ListChecks, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { stageLabel, TRACK_LABEL } from '@/config/labels'
import { fmtRelative, fmtWhen } from '@/lib/format'
import { initials } from '@/lib/utils'
import type { Mentee } from '../api'
import { MENTEE_FLAG } from './labels'

/** Card por mentorado: nome, negócio, estágio, última/próxima mentoria, metas, status. */
export function MenteeCard({ m }: { m: Mentee }) {
  return (
    <Link to={`/neomentor/neoleaders/${m.student_id}`}>
      <Card className="h-full space-y-3 p-4 transition-shadow hover:shadow-md">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11">{m.avatar_url && <AvatarImage src={m.avatar_url} alt="" />}<AvatarFallback>{initials(m.full_name)}</AvatarFallback></Avatar>
          <div className="min-w-0"><p className="truncate font-semibold">{m.full_name}</p><p className="truncate text-xs text-muted-foreground">{m.track ? TRACK_LABEL[m.track] : ''}{m.cohort_name ? ` · ${m.cohort_name}` : ''}</p></div>
        </div>
        <div className="space-y-1.5 text-sm">
          <p className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5 text-muted-foreground" />{m.venture_name ? <>{m.venture_name} <Badge variant="secondary">{m.venture_stage && stageLabel(m.venture_stage)}</Badge></> : <span className="text-muted-foreground">Sem negócio cadastrado</span>}</p>
          <p className="flex items-center gap-2"><History className="h-3.5 w-3.5 text-muted-foreground" />Última: {m.last_session_at ? fmtRelative(m.last_session_at) : 'nenhuma'}</p>
          <p className="flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />Próxima: {m.next_session_at ? fmtWhen(m.next_session_at) : 'não agendada'}</p>
          <p className="flex items-center gap-4">
            <span className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-muted-foreground" />{m.open_goals} metas</span>
            <span className="flex items-center gap-2"><ListChecks className="h-3.5 w-3.5 text-muted-foreground" />{m.open_steps} passos{m.overdue_steps ? ` (${m.overdue_steps} atrasados)` : ''}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {m.flags.length ? m.flags.map((f) => <Badge key={f} variant={f === 'pending_request' ? 'default' : 'warning'}>{MENTEE_FLAG[f] ?? f}</Badge>) : <Badge variant="success">Em dia</Badge>}
        </div>
      </Card>
    </Link>
  )
}
