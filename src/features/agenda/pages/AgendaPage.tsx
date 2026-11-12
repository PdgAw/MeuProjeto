import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarPlus, ChevronLeft, ChevronRight, Download, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { AGENDA_TYPE_LABEL, agendaSubtitle } from '@/config/labels'
import { useAudienceOptions } from '@/features/announcements/api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { fmtTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { exportIcs, useAgenda, useCreateCalendarEvent, type AgendaItem } from '../api'

type View = 'day' | 'week' | 'month' | 'list'
type T = AgendaItem['item_type']
const TYPES = Object.keys(AGENDA_TYPE_LABEL) as T[]
// Type is shown by a text label + a small marker; the marker shade alone never carries meaning.
const DOT: Record<T, string> = { class: 'bg-primary', mentoring: 'bg-dim-mentoring', event: 'bg-dim-experiences', visit: 'bg-dim-participation', deadline: 'bg-warning', panel: 'bg-dim-venture', meeting: 'bg-muted-foreground' }

function linkFor(i: AgendaItem) {
  switch (i.source) {
    case 'lesson': return `/aulas/${i.source_id}`
    case 'mentoring_session': return `/mentorias/${i.source_id}`
    case 'experience': return `/experiencias/${i.source_id}`
    case 'assignment': return `/entregas/${i.source_id}`
    case 'pitch_submission': return '/bancas'
    default: return null
  }
}

export default function AgendaPage() {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState<View>(() => (window.innerWidth < 768 ? 'list' : 'week'))
  const [cursor, setCursor] = useState(new Date())
  const [hidden, setHidden] = useState<T[]>([])
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<AgendaItem | null>(null)
  const range = useMemo(() => {
    if (view === 'day') return { from: startOfDay(cursor), to: addDays(startOfDay(cursor), 1) }
    if (view === 'week') { const from = startOfWeek(cursor, { weekStartsOn: 1 }); return { from, to: addDays(from, 7) } }
    if (view === 'month') { const from = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }); return { from, to: addDays(endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }), 1) } }
    return { from: startOfDay(cursor), to: addDays(startOfDay(cursor), 30) }
  }, [view, cursor])
  const { data, isPending } = useAgenda(range.from, range.to)
  const items = (data ?? []).filter((i) => !hidden.includes(i.item_type))
  const move = (dir: 1 | -1) => setCursor(view === 'day' ? addDays(cursor, dir) : view === 'week' ? addWeeks(cursor, dir) : view === 'month' ? addMonths(cursor, dir) : addDays(cursor, 30 * dir))
  const title = view === 'day' ? format(cursor, "EEEE, dd 'de' MMMM", { locale: ptBR }) : view === 'month' ? format(cursor, 'MMMM yyyy', { locale: ptBR })
    : `${format(range.from, "dd 'de' MMM", { locale: ptBR })} – ${format(addDays(range.to, -1), "dd 'de' MMM", { locale: ptBR })}`
  const open = (i: AgendaItem) => { const l = linkFor(i); if (l) navigate(l); else setSelected(i) }
  const days = eachDayOfInterval({ start: range.from, end: addDays(range.to, -1) })

  const Item = ({ i, compact }: { i: AgendaItem; compact?: boolean }) => (
    <button onClick={() => open(i)} className={cn('flex w-full items-start gap-1.5 rounded-md text-left hover:bg-secondary/70', compact ? 'px-1 py-0.5 text-[11px]' : 'p-2 text-sm')}>
      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', DOT[i.item_type])} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate', !compact && 'font-medium')}>{!compact && `${fmtTime(i.starts_at)} · `}{i.item_type === 'class' ? i.subtitle : i.title}</span>
        {!compact && <span className="block truncate text-xs text-muted-foreground">{AGENDA_TYPE_LABEL[i.item_type]}{i.item_type === 'class' ? ` · ${i.title}` : agendaSubtitle(i) ? ` · ${agendaSubtitle(i)}` : ''}{i.location ? ` · ${i.location}` : ''}</span>}
      </span>
    </button>
  )

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold sm:text-3xl">Agenda</h1><p className="mt-1 text-muted-foreground first-letter:uppercase">{title}</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportIcs(items, `agenda-neolevel-${format(range.from, 'yyyy-MM-dd')}`)} disabled={!items.length}><Download /> Exportar (.ics)</Button>
          <Button onClick={() => setCreating(true)}><Plus /> Compromisso</Button>
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" onClick={() => move(-1)} aria-label="Anterior"><ChevronLeft /></Button>
          <Button variant="outline" onClick={() => setCursor(new Date())}>Hoje</Button>
          <Button size="icon" variant="outline" onClick={() => move(1)} aria-label="Próximo"><ChevronRight /></Button>
        </div>
        <div className="inline-flex rounded-lg bg-muted p-1">
          {(['day', 'week', 'month', 'list'] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cn('rounded-md px-3 py-1.5 text-sm font-medium', view === v ? 'bg-background shadow-sm' : 'text-muted-foreground')}>{{ day: 'Dia', week: 'Semana', month: 'Mês', list: 'Agenda' }[v]}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5" aria-label="Filtrar por tipo">
        {TYPES.map((t) => (
          <button key={t} onClick={() => setHidden(hidden.includes(t) ? hidden.filter((x) => x !== t) : [...hidden, t])} aria-pressed={!hidden.includes(t)}
            className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', hidden.includes(t) ? 'text-muted-foreground line-through opacity-60' : 'bg-card')}>
            <span className={cn('h-2 w-2 rounded-full', DOT[t])} />{AGENDA_TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {isPending ? <CardSkeleton lines={5} /> : view === 'month' ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-semibold uppercase text-muted-foreground">{['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map((d) => <div key={d} className="py-2">{d}</div>)}</div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const list = items.filter((i) => isSameDay(new Date(i.starts_at), d))
              return (
                <div key={d.toISOString()} className={cn('min-h-24 border-b border-r p-1', !isSameMonth(d, cursor) && 'bg-muted/30 text-muted-foreground')}>
                  <button onClick={() => { setCursor(d); setView('day') }} className={cn('mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium', isToday(d) && 'bg-primary text-primary-foreground')}>{format(d, 'd')}</button>
                  {list.slice(0, 3).map((i) => <Item key={`${i.source}-${i.source_id}`} i={i} compact />)}
                  {list.length > 3 && <button onClick={() => { setCursor(d); setView('day') }} className="px-1 text-[11px] font-medium text-primary">+{list.length - 3} mais</button>}
                </div>
              )
            })}
          </div>
        </Card>
      ) : view === 'week' ? (
        <div className="grid gap-2 md:grid-cols-7">
          {days.map((d) => {
            const list = items.filter((i) => isSameDay(new Date(i.starts_at), d))
            return (
              <Card key={d.toISOString()} className={cn('min-h-32 p-2', isToday(d) && 'border-primary')}>
                <p className={cn('mb-1 px-1 text-xs font-semibold uppercase', isToday(d) ? 'text-primary' : 'text-muted-foreground')}>{format(d, 'EEE dd', { locale: ptBR })}</p>
                {list.length ? list.map((i) => <Item key={`${i.source}-${i.source_id}`} i={i} />) : <p className="px-1 text-xs text-muted-foreground">—</p>}
              </Card>
            )
          })}
        </div>
      ) : !items.length ? <EmptyState text="Nada na agenda neste período." /> : (
        <div className="space-y-4">
          {days.filter((d) => items.some((i) => isSameDay(new Date(i.starts_at), d))).map((d) => (
            <section key={d.toISOString()}>
              <h3 className={cn('mb-1 text-sm font-semibold first-letter:uppercase', isToday(d) ? 'text-primary' : 'text-muted-foreground')}>{isToday(d) ? 'Hoje · ' : ''}{format(d, "EEEE, dd 'de' MMMM", { locale: ptBR })}</h3>
              <Card className="divide-y">{items.filter((i) => isSameDay(new Date(i.starts_at), d)).map((i) => <Item key={`${i.source}-${i.source_id}`} i={i} />)}</Card>
            </section>
          ))}
        </div>
      )}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarPlus className="h-3.5 w-3.5" />A sincronização automática com Google Calendar e Outlook está prevista; por ora, use "Exportar (.ics)".</p>
      {creating && <EventDialog staff={hasPermission('events.manage')} onClose={() => setCreating(false)} />}
      {selected && (
        <Dialog open onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent title={selected.title} description={`${AGENDA_TYPE_LABEL[selected.item_type]} · ${format(new Date(selected.starts_at), "dd/MM 'às' HH:mm")}`}>
            <div className="space-y-2 text-sm">{selected.subtitle && <p>{selected.subtitle}</p>}{selected.location && <p className="text-muted-foreground">{selected.location}</p>}
              {selected.url && <a href={selected.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Entrar na reunião</a>}</div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function EventDialog({ staff, onClose }: { staff: boolean; onClose: () => void }) {
  const create = useCreateCalendarEvent()
  const opts = useAudienceOptions()
  const [v, setV] = useState({ title: '', type: 'meeting', start: '', end: '', location: '', url: '', audience: 'me', target: '' })
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Novo compromisso">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault()
          if (v.title.trim().length < 3 || !v.start) return toast.error('Informe título e início.')
          if (v.audience !== 'me' && v.audience !== 'all' && !v.target) return toast.error('Escolha o público.')
          const target = v.audience === 'me' ? { target_type: 'user' as const, target_id: null, role_key: null } : v.audience === 'all' ? { target_type: 'all' as const, target_id: null, role_key: null }
            : v.audience === 'role' ? { target_type: 'role' as const, target_id: null, role_key: v.target } : { target_type: 'cohort' as const, target_id: v.target, role_key: null }
          create.mutate({ title: v.title.trim(), description: null, type: v.type as AgendaItem['item_type'], starts_at: new Date(v.start).toISOString(), ends_at: v.end ? new Date(v.end).toISOString() : null, location: v.location || null, meeting_url: v.url || null, target },
            { onSuccess: () => { toast.success('Compromisso criado.'); onClose() }, onError: (er) => toast.error(er.message) })
        }}>
          <FormField id="ev-title" label="Título"><Input id="ev-title" value={v.title} onChange={set('title')} /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="ev-type" label="Tipo"><Select id="ev-type" value={v.type} onChange={set('type')}><option value="meeting">Reunião</option><option value="event">Evento</option><option value="deadline">Entrega</option><option value="visit">Visita</option></Select></FormField>
            <FormField id="ev-aud" label="Para quem">
              <Select id="ev-aud" value={v.audience} onChange={set('audience')}><option value="me">Só para mim</option>{staff && <><option value="all">Todos</option><option value="cohort">Uma turma</option><option value="role">Um cargo</option></>}</Select>
            </FormField>
            {(v.audience === 'cohort' || v.audience === 'role') && (
              <FormField id="ev-target" label={v.audience === 'cohort' ? 'Turma' : 'Cargo'}>
                <Select id="ev-target" value={v.target} onChange={set('target')}><option value="">Selecione…</option>
                  {v.audience === 'cohort' ? opts.data?.cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>) : opts.data?.roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}</Select>
              </FormField>
            )}
            <FormField id="ev-start" label="Início"><Input id="ev-start" type="datetime-local" value={v.start} onChange={set('start')} /></FormField>
            <FormField id="ev-end" label="Término"><Input id="ev-end" type="datetime-local" value={v.end} onChange={set('end')} /></FormField>
            <FormField id="ev-loc" label="Local"><Input id="ev-loc" value={v.location} onChange={set('location')} /></FormField>
            <FormField id="ev-url" label="Link (opcional)"><Input id="ev-url" type="url" value={v.url} onChange={set('url')} /></FormField>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={create.isPending}>Criar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
