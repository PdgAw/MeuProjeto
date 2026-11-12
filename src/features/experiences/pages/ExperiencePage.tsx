import { ArrowLeft, Building2, CalendarDays, CalendarPlus, CheckCircle2, Image, Lightbulb, Loader2, MapPin, Pencil, Star, Upload, Users } from 'lucide-react'
import { format, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CardSkeleton, EmptyState, SectionCard } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { openStoredFile, signedUrl } from '@/lib/storage'
import { cn, initials } from '@/lib/utils'
import { downloadIcs, useAddMedia, useCancelRegistration, useExperience, useExperienceCheckIn, useRegister, useSaveReflection, useSetRegistration, type ExperienceDetail, type RegistrationStatus } from '../api'
import { ExperienceFormDialog } from '../components/ExperienceFormDialog'
import { CATEGORY, REG_STATUS } from '../components/labels'

export default function ExperiencePage() {
  const { id } = useParams()
  const { user, hasPermission } = useAuth()
  const { data: x, isPending } = useExperience(id)
  const register = useRegister()
  const cancel = useCancelRegistration()
  const checkIn = useExperienceCheckIn()
  const [editing, setEditing] = useState(false)
  if (!user) return null
  if (isPending) return <CardSkeleton lines={5} />
  if (!x) return <p className="text-muted-foreground">Experiência não encontrada.</p>
  const manage = hasPermission('events.manage') || x.owner_id === user.user_id
  const mine = x.experience_registrations.find((r) => r.user_id === user.user_id)
  const active = mine && mine.status !== 'canceled'
  const start = new Date(x.starts_at)
  const end = new Date(x.ends_at ?? start.getTime() + 4 * 3600e3)
  const ended = isPast(end)
  const checkinWindow = Date.now() >= start.getTime() - 3600e3 && !ended
  const closed = !x.registration_open || (x.registration_deadline && isPast(new Date(x.registration_deadline)))

  return (
    <div className="space-y-6">
      <Link to="/experiencias" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Experiências Neo</Link>
      <div className="relative overflow-hidden rounded-xl bg-sidebar p-6 text-sidebar-foreground sm:p-8">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,hsl(var(--primary)/0.55),transparent_55%)]" />
        <div className="relative space-y-3">
          <Badge variant="accent">{CATEGORY[x.category]}</Badge>
          <h1 className="text-2xl font-semibold sm:text-3xl">{x.title}</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-sidebar-muted">
            <span className="flex items-center gap-1.5 first-letter:uppercase"><CalendarDays className="h-4 w-4" />{format(start, "EEEE, dd 'de' MMMM · HH:mm", { locale: ptBR })}{x.ends_at ? `–${format(end, 'HH:mm')}` : ''}</span>
            {x.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{x.location}</span>}
            {x.capacity && <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{x.capacity} vagas</span>}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] [&>*]:min-w-0">
        <div className="space-y-6">
          <Card><CardContent className="space-y-3 pt-5 text-sm">
            {x.description && <p className="whitespace-pre-line leading-relaxed">{x.description}</p>}
            {x.companies.length > 0 && <p className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{x.companies.join(', ')}</p>}
            {x.guests && <p><span className="text-muted-foreground">Convidados:</span> {x.guests}</p>}
            {x.owner && <p className="text-xs text-muted-foreground">Responsável: {x.owner.full_name}</p>}
          </CardContent></Card>
          {(ended || x.experience_media.length > 0) && <MediaSection x={x} manage={manage} />}
          {x.is_educational && ended && active && !manage && <ReflectionForm x={x} userId={user.user_id} />}
          {manage && <Registrations x={x} />}
          {manage && <Feedback x={x} />}
        </div>
        <aside className="space-y-4">
          <Card><CardContent className="space-y-3 pt-5">
            {active ? (
              <p className="flex items-center gap-2 font-medium">{mine.status === 'attended' ? <CheckCircle2 className="h-4 w-4 text-success" /> : null}
                <Badge variant={REG_STATUS[mine.status].variant}>{REG_STATUS[mine.status].label}</Badge></p>
            ) : <p className="text-sm text-muted-foreground">{ended ? 'Esta experiência já aconteceu.' : closed ? 'Inscrições encerradas.' : 'Garanta sua vaga.'}</p>}
            {mine?.status === 'waitlist' && <p className="text-xs text-muted-foreground">Se alguém cancelar, você é confirmado automaticamente e recebe um aviso.</p>}
            {!manage && !active && !ended && !closed && (
              <Button className="w-full" disabled={register.isPending} onClick={() => register.mutate(x.id, {
                onSuccess: (r) => toast.success(r.status === 'waitlist' ? 'Vagas esgotadas: você está na lista de espera.' : 'Presença confirmada!'),
                onError: (e) => toast.error(e.message),
              })}>Confirmar presença</Button>
            )}
            {active && mine.status === 'confirmed' && checkinWindow && (
              <Button variant="accent" className="w-full" disabled={checkIn.isPending} onClick={() => checkIn.mutate(x.id, { onSuccess: () => toast.success('Check-in feito. Bom proveito!'), onError: (e) => toast.error(e.message) })}>Fazer check-in</Button>
            )}
            {!ended && (active || manage) && <Button variant="outline" className="w-full" onClick={() => downloadIcs(x)}><CalendarPlus /> Adicionar ao calendário</Button>}
            {active && !ended && (mine.status === 'confirmed' || mine.status === 'waitlist') && (
              <Button variant="ghost" className="w-full" disabled={cancel.isPending} onClick={() => { if (confirm('Cancelar sua inscrição?')) cancel.mutate(x.id, { onSuccess: () => toast.success('Inscrição cancelada.') }) }}>Cancelar inscrição</Button>
            )}
            {manage && <Button variant="outline" className="w-full" onClick={() => setEditing(true)}><Pencil /> Editar experiência</Button>}
          </CardContent></Card>
        </aside>
      </div>
      <ExperienceFormDialog open={editing} onOpenChange={setEditing} experience={x} />
    </div>
  )
}

function MediaSection({ x, manage }: { x: ExperienceDetail; manage: boolean }) {
  const add = useAddMedia(x.id)
  const [insight, setInsight] = useState('')
  const photos = x.experience_media.filter((m) => m.kind === 'photo')
  const others = x.experience_media.filter((m) => m.kind !== 'photo')
  return (
    <SectionCard title="Fotos, materiais e insights" icon={<Image className="h-4 w-4 text-primary" />}>
      <div className="space-y-4">
        {photos.length > 0 && <div className="grid grid-cols-3 gap-2">{photos.map((p) => <MediaThumb key={p.id} path={p.storage_path} title={p.title} />)}</div>}
        <ul className="space-y-2 text-sm">
          {others.map((m) => (
            <li key={m.id} className="rounded-md bg-secondary/50 p-3">
              {m.kind === 'insight' ? <p className="flex gap-2"><Lightbulb className="h-4 w-4 shrink-0 text-warning" />{m.body}</p> :
                <button className="text-primary hover:underline" onClick={() => m.storage_path ? void openStoredFile('experiences', m.storage_path).catch((e) => toast.error(e.message)) : m.url && window.open(m.url, '_blank', 'noopener')}>{m.title ?? 'Material'}</button>}
            </li>
          ))}
        </ul>
        {!x.experience_media.length && <EmptyState text="Fotos e materiais serão publicados após o evento." />}
        {manage && (
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-secondary">
              <Upload className="h-4 w-4" />{add.isPending ? 'Enviando…' : 'Fotos / materiais'}
              <input type="file" multiple className="sr-only" onChange={async (e) => {
                for (const f of Array.from(e.target.files ?? [])) await add.mutateAsync({ kind: f.type.startsWith('image/') ? 'photo' : 'material', title: f.name, file: f }).catch((er) => toast.error(er.message))
                toast.success('Publicado.')
              }} />
            </label>
            <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); if (insight.trim()) add.mutate({ kind: 'insight', title: '', body: insight.trim() }, { onSuccess: () => setInsight('') }) }}>
              <Input placeholder="Insight da experiência" value={insight} onChange={(e) => setInsight(e.target.value)} aria-label="Insight" />
              <Button type="submit" variant="outline">Publicar</Button>
            </form>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function MediaThumb({ path, title }: { path: string | null; title: string | null }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { if (path) signedUrl('experiences', path).then(setUrl).catch(() => setUrl(null)) }, [path])
  return url ? <img src={url} alt={title ?? ''} className="aspect-square w-full rounded-md object-cover" /> : <div className="aspect-square animate-pulse rounded-md bg-muted" />
}

function ReflectionForm({ x, userId }: { x: ExperienceDetail; userId: string }) {
  const mine = x.experience_reflections.find((r) => r.user_id === userId)
  const save = useSaveReflection(x.id)
  const [v, setV] = useState({ main_learning: '', application: '', rating: 0, feedback: '' })
  useEffect(() => setV({ main_learning: mine?.main_learning ?? '', application: mine?.application ?? '', rating: mine?.rating ?? 0, feedback: mine?.feedback ?? '' }), [mine])
  return (
    <SectionCard title="Seu aprendizado" icon={<Lightbulb className="h-4 w-4 text-warning" />}>
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault()
        if (!v.main_learning.trim()) return toast.error('Conte seu principal aprendizado.')
        save.mutate({ userId, main_learning: v.main_learning.trim(), application: v.application.trim(), rating: v.rating || null, feedback: v.feedback.trim() },
          { onSuccess: () => toast.success('Aprendizado registrado. Ele entra no seu Neo Progress.'), onError: (er) => toast.error(er.message) })
      }}>
        <FormField id="rf-learn" label="Meu principal aprendizado"><Textarea id="rf-learn" rows={3} value={v.main_learning} onChange={(e) => setV({ ...v, main_learning: e.target.value })} /></FormField>
        <FormField id="rf-apply" label="O que aplicarei no meu negócio?"><Textarea id="rf-apply" rows={3} value={v.application} onChange={(e) => setV({ ...v, application: e.target.value })} /></FormField>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Como foi a experiência?</p>
          <div className="flex gap-1" role="radiogroup" aria-label="Avaliação de 1 a 5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={v.rating === n} aria-label={`${n} estrela${n > 1 ? 's' : ''}`} onClick={() => setV({ ...v, rating: n })}>
                <Star className={cn('h-7 w-7', n <= v.rating ? 'fill-warning text-warning' : 'text-muted-foreground')} />
              </button>
            ))}
          </div>
        </div>
        <FormField id="rf-fb" label="Feedback para a coordenação (opcional)"><Textarea id="rf-fb" rows={2} value={v.feedback} onChange={(e) => setV({ ...v, feedback: e.target.value })} /></FormField>
        <div className="flex justify-end"><Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="animate-spin" />}{mine ? 'Atualizar' : 'Registrar aprendizado'}</Button></div>
      </form>
    </SectionCard>
  )
}

function Registrations({ x }: { x: ExperienceDetail }) {
  const set = useSetRegistration(x.id)
  const regs = [...x.experience_registrations].sort((a, b) => a.registered_at.localeCompare(b.registered_at))
  const count = (s: RegistrationStatus) => regs.filter((r) => r.status === s).length
  return (
    <SectionCard title={`Inscritos (${regs.filter((r) => r.status !== 'canceled').length})`} icon={<Users className="h-4 w-4 text-primary" />}>
      <p className="mb-3 text-xs text-muted-foreground">Confirmados {count('confirmed')} · Lista de espera {count('waitlist')} · Presentes {count('attended')}{x.capacity ? ` · Capacidade ${x.capacity}` : ''}</p>
      {!regs.length ? <EmptyState text="Nenhuma inscrição ainda." /> : (
        <ul className="divide-y rounded-lg border">
          {regs.map((r) => (
            <li key={r.user_id} className="flex items-center gap-3 px-3 py-2.5">
              <Avatar className="h-8 w-8">{r.user?.avatar_url && <AvatarImage src={r.user.avatar_url} alt="" />}<AvatarFallback className="text-xs">{initials(r.user?.full_name)}</AvatarFallback></Avatar>
              <span className="flex-1 text-sm font-medium">{r.user?.full_name}</span>
              <Select className="h-8 w-44 text-xs" value={r.status} aria-label={`Situação de ${r.user?.full_name}`}
                onChange={(e) => set.mutate({ userId: r.user_id, status: e.target.value as RegistrationStatus }, { onError: (er) => toast.error(er.message) })}>
                {Object.entries(REG_STATUS).map(([k, l]) => <option key={k} value={k}>{l.label}</option>)}
              </Select>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

function Feedback({ x }: { x: ExperienceDetail }) {
  const list = x.experience_reflections
  if (!list.length) return null
  const rated = list.filter((r) => r.rating)
  const avg = rated.length ? (rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length).toFixed(1) : null
  return (
    <SectionCard title={`Aprendizados e feedback (${list.length})`} icon={<Lightbulb className="h-4 w-4 text-warning" />}>
      {avg && <p className="mb-3 flex items-center gap-1 text-sm"><Star className="h-4 w-4 fill-warning text-warning" /><strong>{avg}</strong> de 5 · {rated.length} avaliações</p>}
      <ul className="space-y-3 text-sm">
        {list.map((r) => (
          <li key={r.user_id} className="rounded-md bg-secondary/50 p-3">
            <p className="text-xs font-semibold">{r.user?.full_name}</p>
            {r.main_learning && <p className="mt-1"><span className="text-muted-foreground">Aprendizado:</span> {r.main_learning}</p>}
            {r.application && <p className="mt-1"><span className="text-muted-foreground">Vai aplicar:</span> {r.application}</p>}
            {r.feedback && <p className="mt-1 italic">“{r.feedback}”</p>}
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
