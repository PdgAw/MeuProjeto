import { ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { initials } from '@/lib/utils'
import type { Session } from '../api'
import { SESSION_STATUS } from '../components/labels'

export function SessionRow({ s, viewer }: { s: Session; viewer: 'student' | 'mentor' | 'staff' }) {
  const other = viewer === 'student' ? s.mentor : s.student
  const st = SESSION_STATUS[s.status]
  return (
    <li>
      <Link to={`/mentorias/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/40">
        <Avatar className="h-9 w-9">{other?.avatar_url && <AvatarImage src={other.avatar_url} alt="" />}<AvatarFallback className="text-xs">{initials(other?.full_name)}</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{viewer === 'staff' ? `${s.student?.full_name} · ${s.mentor?.full_name}` : other?.full_name}</p>
          <p className="truncate text-xs first-letter:uppercase text-muted-foreground">
            {s.scheduled_at ? format(new Date(s.scheduled_at), "EEE, dd/MM 'às' HH:mm", { locale: ptBR }) : 'Horário a definir'}
            {s.topics.length ? ` · ${s.topics.join(', ')}` : ''}
          </p>
        </div>
        <Badge variant={st.variant}>{st.label}</Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </li>
  )
}
