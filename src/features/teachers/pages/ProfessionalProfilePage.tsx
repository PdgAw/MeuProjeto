import { StartChatButton } from '@/components/shared/StartChatButton'
import { ArrowLeft, Building2, ExternalLink, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CardSkeleton, EmptyState, SectionCard } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { initials } from '@/lib/utils'
import { useProfessional, useUpcomingLessonsOf } from '../api'
import { ProfessionalFormDialog } from '../components/ProfessionalFormDialog'

/** Professional profile of teachers, guest teachers and Neomentores. */
export default function ProfessionalProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, hasPermission } = useAuth()
  const { data: p, isPending } = useProfessional(id)
  const lessons = useUpcomingLessonsOf(id)
  const [editing, setEditing] = useState(false)
  if (isPending) return <CardSkeleton lines={4} />
  if (!p) return <p className="text-muted-foreground">Perfil não encontrado.</p>
  const canEdit = user?.user_id === p.id || hasPermission('users.edit')
  const roles = p.user_roles.map((r) => r.role?.name).filter(Boolean)
  const subjects = p.subject_teachers.filter((s) => s.subject && s.subject.status !== 'archived')

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar</button>
      <Card className="overflow-hidden">
        <div className="h-24 bg-sidebar bg-[radial-gradient(circle_at_85%_10%,hsl(var(--primary)/0.5),transparent_55%)]" />
        <CardContent className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <Avatar className="h-20 w-20 border-4 border-card">{p.avatar_url && <AvatarImage src={p.avatar_url} alt="" />}<AvatarFallback className="text-xl">{initials(p.full_name)}</AvatarFallback></Avatar>
            <div className="pb-1">
              <h1 className="text-2xl font-semibold">{p.full_name}</h1>
              <p className="text-muted-foreground">{p.pro?.headline ?? p.job_title}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pb-1">
            {roles.map((r) => <Badge key={r}>{r}</Badge>)}
            {p.pro?.is_guest && <Badge variant="outline">Convidado</Badge>}
            {canEdit && <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil /> Editar perfil</Button>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] [&>*]:min-w-0">
        <div className="space-y-6">
          <SectionCard title="Sobre">
            <p className="whitespace-pre-line text-sm leading-relaxed">{p.pro?.bio || 'Bio ainda não preenchida.'}</p>
            {!!p.pro?.specialties.length && (
              <div className="mt-4"><p className="mb-2 text-sm font-semibold">Especialidades</p><div className="flex flex-wrap gap-2">{p.pro.specialties.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div></div>
            )}
            {!!p.pro?.areas.length && (
              <div className="mt-4"><p className="mb-2 text-sm font-semibold">Áreas de atuação</p><div className="flex flex-wrap gap-2">{p.pro.areas.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</div></div>
            )}
          </SectionCard>
          <SectionCard title="Disciplinas">
            {!subjects.length ? <EmptyState text="Sem disciplinas no momento." /> : (
              <ul className="space-y-2">{subjects.map((s) => (
                <li key={s.subject!.id}><Link to={`/disciplinas/${s.subject!.id}`} className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-secondary/50">
                  <span className="font-medium">{s.subject!.name}</span><Badge variant="secondary">{s.role === 'lead' ? 'Responsável' : 'Convidado'}</Badge></Link></li>
              ))}</ul>
            )}
          </SectionCard>
        </div>
        <div className="space-y-6">
          <Card><CardContent className="space-y-3 pt-5 text-sm">
            {(p.pro?.position || p.pro?.company) && <p className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{[p.pro?.position, p.pro?.company].filter(Boolean).join(' · ')}</p>}
            {p.pro?.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline"><ExternalLink className="h-4 w-4" />{l.label}</a>)}
            {user?.user_id !== p.id && <StartChatButton size="sm" variant="outline" userId={p.id} label="Enviar mensagem" />}
            <p className="text-xs text-muted-foreground">Contato direto pelo Chat da plataforma — e-mail e telefone não são exibidos.</p>
          </CardContent></Card>
          <SectionCard title="Próximas aulas">
            {!lessons.data?.length ? <EmptyState text="Nenhuma aula agendada." /> : (
              <ul className="space-y-2 text-sm">{lessons.data.map((l) => (
                <li key={l.id}><Link to={`/aulas/${l.id}`} className="block hover:underline"><p className="font-medium">{l.subject?.name}</p>
                  <p className="text-xs first-letter:uppercase text-muted-foreground">{format(new Date(l.starts_at), "EEE, dd/MM · HH:mm", { locale: ptBR })} · {l.cohort?.name}</p></Link></li>
              ))}</ul>
            )}
          </SectionCard>
        </div>
      </div>
      {canEdit && <ProfessionalFormDialog open={editing} onOpenChange={setEditing} person={p} />}
    </div>
  )
}
