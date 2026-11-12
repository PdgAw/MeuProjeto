import { Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { initials } from '@/lib/utils'
import { useTeachers } from '../api'

export default function TeachersPage() {
  const { data, isPending } = useTeachers()
  const [q, setQ] = useState('')
  const list = (data ?? []).filter((t) => !q || `${t.full_name} ${t.professional_profiles?.specialties.join(' ')} ${t.professional_profiles?.company ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold sm:text-3xl">Professores</h1><p className="mt-1 text-muted-foreground">Professores e professores convidados da NeoLevel.</p></header>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome, especialidade ou empresa" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {isPending ? <CardSkeleton lines={3} /> : !list.length ? <EmptyState text="Nenhum professor encontrado. Convide professores em Usuários." /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => {
            const pp = t.professional_profiles
            const subjects = t.subject_teachers.filter((s) => s.subject && s.subject.status !== 'archived')
            return (
              <Link key={t.id} to={`/professores/${t.id}`}>
                <Card className="h-full space-y-3 p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">{t.avatar_url && <AvatarImage src={t.avatar_url} alt="" />}<AvatarFallback>{initials(t.full_name)}</AvatarFallback></Avatar>
                    <div className="min-w-0"><p className="truncate font-semibold">{t.full_name}</p>
                      <p className="truncate text-sm text-muted-foreground">{[pp?.position ?? t.job_title, pp?.company ?? t.company].filter(Boolean).join(' · ') || 'Professor'}</p></div>
                  </div>
                  {pp?.specialties.length ? <div className="flex flex-wrap gap-1.5">{pp.specialties.slice(0, 4).map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div> : null}
                  <p className="text-xs text-muted-foreground">{subjects.length ? subjects.map((s) => s.subject!.name).join(' · ') : 'Sem disciplinas no momento'}</p>
                  {(pp?.is_guest || t.status === 'invited') && <div className="flex gap-2">{pp?.is_guest && <Badge variant="outline">Convidado</Badge>}{t.status === 'invited' && <Badge variant="warning">Convite pendente</Badge>}</div>}
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
