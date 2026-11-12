import { Check, ExternalLink, MapPin, MessagesSquare, Search, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { stageLabel, VENTURE_STAGES } from '@/config/labels'
import { useCohorts } from '@/features/academic/api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn, initials } from '@/lib/utils'
import { useConnectionActions, useConnections, useDirectory, type Connection, type Person } from '../api'

const KIND = { neoleader: 'Neoleader', mentor: 'Neomentor', teacher: 'Professor' } as Record<string, string>

/** Comunidade Neo — only what each person chose to share; e-mail/phone never appear here. */
export default function CommunityPage() {
  const { user } = useAuth()
  const [kind, setKind] = useState('')
  const [search, setSearch] = useState('')
  const [cohort, setCohort] = useState('')
  const [stage, setStage] = useState('')
  const dir = useDirectory({ search: search.trim().length >= 2 ? search.trim() : undefined, kind, cohort, stage: (stage || undefined) as Person['venture_stage'] | undefined })
  const cohorts = useCohorts()
  const conns = useConnections(user?.user_id)
  const [open, setOpen] = useState<Person | null>(null)
  if (!user) return null
  const incoming = (conns.data ?? []).filter((c) => c.incoming && c.status === 'pending')
  const connected = (conns.data ?? []).filter((c) => c.status === 'accepted')
  const people = (dir.data ?? []).filter((p) => p.user_id !== user.user_id)

  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold sm:text-3xl">Comunidade Neo</h1>
        <p className="mt-1 text-muted-foreground">Neoleaders, Neomentores e professores. Cada pessoa decide o que compartilha. <Link to="/perfil" className="text-primary hover:underline">Ajustar minha privacidade</Link></p></header>
      <Tabs defaultValue="diretorio">
        <TabsList>
          <TabsTrigger value="diretorio">Diretório</TabsTrigger>
          <TabsTrigger value="conexoes">Conexões {incoming.length > 0 && <Badge className="ml-1.5">{incoming.length}</Badge>}</TabsTrigger>
        </TabsList>
        <TabsContent value="diretorio" className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_11rem_11rem_11rem]">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Nome, empresa, setor, especialidade, interesse" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar" /></div>
            <Select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Tipo"><option value="">Todos</option><option value="neoleader">Neoleaders</option><option value="mentor">Neomentores</option><option value="teacher">Professores</option></Select>
            <Select value={cohort} onChange={(e) => setCohort(e.target.value)} aria-label="Turma"><option value="">Todas as turmas</option>{cohorts.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            <Select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Estágio do negócio"><option value="">Qualquer estágio</option>{VENTURE_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
          </div>
          {dir.isPending ? <CardSkeleton lines={3} /> : !people.length ? <EmptyState text="Ninguém encontrado com esses filtros." /> : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {people.map((p) => (
                <button key={p.user_id} onClick={() => setOpen(p)} className="text-left">
                  <Card className="h-full space-y-3 p-4 transition-shadow hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">{p.avatar_url && <AvatarImage src={p.avatar_url} alt="" />}<AvatarFallback>{initials(p.full_name)}</AvatarFallback></Avatar>
                      <div className="min-w-0"><p className="truncate font-semibold">{p.full_name}</p><p className="truncate text-sm text-muted-foreground">{[p.job_title, p.company].filter(Boolean).join(' · ') || KIND[p.kind]}</p></div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={p.kind === 'neoleader' ? 'default' : 'secondary'}>{KIND[p.kind]}</Badge>
                      {p.cohort_name && <Badge variant="outline">{p.cohort_name}</Badge>}
                      {p.venture_name && <Badge variant="outline">{p.venture_name}{p.venture_stage ? ` · ${stageLabel(p.venture_stage)}` : ''}</Badge>}
                    </div>
                    {p.city && <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{p.city}</p>}
                    {[...p.interests, ...p.specialties].length > 0 && <p className="truncate text-xs text-muted-foreground">{[...p.specialties, ...p.interests].slice(0, 4).join(' · ')}</p>}
                  </Card>
                </button>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="conexoes"><ConnectionsTab all={conns.data ?? []} incoming={incoming} connected={connected} /></TabsContent>
      </Tabs>
      {open && <PersonDialog person={open} me={user.user_id} connection={conns.data?.find((c) => c.other?.id === open.user_id)} onClose={() => setOpen(null)} />}
    </div>
  )
}

function PersonDialog({ person: p, me, connection, onClose }: { person: Person; me: string; connection?: Connection; onClose: () => void }) {
  const { request } = useConnectionActions()
  const [msg, setMsg] = useState('')
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={p.full_name} description={[p.job_title, p.company].filter(Boolean).join(' · ') || KIND[p.kind]}>
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16">{p.avatar_url && <AvatarImage src={p.avatar_url} alt="" />}<AvatarFallback className="text-lg">{initials(p.full_name)}</AvatarFallback></Avatar>
            <div className="flex flex-wrap gap-1.5"><Badge>{KIND[p.kind]}</Badge>{p.cohort_name && <Badge variant="outline">{p.cohort_name}</Badge>}{p.city && <Badge variant="outline"><MapPin className="h-3 w-3" />{p.city}</Badge>}</div>
          </div>
          {p.bio && <p className="whitespace-pre-line">{p.bio}</p>}
          {p.venture_name && <p><span className="text-muted-foreground">Negócio:</span> <strong>{p.venture_name}</strong>{p.venture_segment ? ` · ${p.venture_segment}` : ''}{p.venture_stage ? ` · ${stageLabel(p.venture_stage)}` : ''}</p>}
          {[['Especialidades', p.specialties], ['Competências', p.competencies], ['Interesses', p.interests], ['Setores', p.sectors]].map(([l, arr]) => (arr as string[]).length > 0 && (
            <div key={l as string}><p className="mb-1 text-xs font-semibold text-muted-foreground">{l as string}</p><div className="flex flex-wrap gap-1.5">{(arr as string[]).map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div></div>
          ))}
          {p.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline"><ExternalLink className="h-4 w-4" />LinkedIn</a>}
          <div className="border-t pt-4">
            {connection?.status === 'accepted' ? (
              <div className="flex flex-wrap items-center gap-2"><Badge variant="success"><Check className="h-3 w-3" />Conectados</Badge><Button size="sm" variant="outline" asChild><Link to="/chat"><MessagesSquare /> Conversar</Link></Button></div>
            ) : connection?.status === 'pending' ? (
              <Badge variant="warning">{connection.incoming ? 'Pedido recebido: responda em Conexões' : 'Pedido enviado'}</Badge>
            ) : (
              <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); request.mutate({ me, to: p.user_id, message: msg }, { onSuccess: () => { toast.success('Pedido de conexão enviado.'); onClose() }, onError: (er) => toast.error(er.message) }) }}>
                <Textarea rows={2} placeholder="Mensagem (opcional): por que quer se conectar?" value={msg} onChange={(e) => setMsg(e.target.value)} aria-label="Mensagem de conexão" />
                <Button type="submit" disabled={request.isPending}><UserPlus /> Conectar</Button>
              </form>
            )}
          </div>
          <p className="text-xs text-muted-foreground">E-mail e telefone nunca são exibidos na Comunidade.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ConnectionsTab({ all, incoming, connected }: { all: Connection[]; incoming: Connection[]; connected: Connection[] }) {
  const { respond, remove } = useConnectionActions()
  const sent = all.filter((c) => !c.incoming && c.status === 'pending')
  const Row = ({ c, children }: { c: Connection; children?: React.ReactNode }) => (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="h-9 w-9">{c.other?.avatar_url && <AvatarImage src={c.other.avatar_url} alt="" />}<AvatarFallback className="text-xs">{initials(c.other?.full_name)}</AvatarFallback></Avatar>
        <div className="min-w-0"><p className="truncate font-medium">{c.other?.full_name}</p>{c.message && <p className="truncate text-xs text-muted-foreground">“{c.message}”</p>}</div>
      </div>
      <div className="flex gap-2">{children}</div>
    </li>
  )
  return (
    <div className="space-y-6">
      {incoming.length > 0 && (
        <section><h3 className="mb-2 text-sm font-semibold">Pedidos recebidos</h3>
          <ul className="divide-y rounded-lg border bg-card">{incoming.map((c) => (
            <Row key={c.id} c={c}>
              <Button size="sm" onClick={() => respond.mutate({ id: c.id, accept: true }, { onSuccess: () => toast.success('Conexão aceita.') })}><Check /> Aceitar</Button>
              <Button size="sm" variant="outline" onClick={() => respond.mutate({ id: c.id, accept: false })}><X /> Recusar</Button>
            </Row>
          ))}</ul>
        </section>
      )}
      <section><h3 className="mb-2 text-sm font-semibold">Minhas conexões ({connected.length})</h3>
        {!connected.length ? <EmptyState text="Você ainda não tem conexões. Explore o diretório." /> : (
          <ul className="divide-y rounded-lg border bg-card">{connected.map((c) => <Row key={c.id} c={c}><Button size="sm" variant="outline" asChild><Link to="/chat"><MessagesSquare /> Conversar</Link></Button></Row>)}</ul>
        )}
      </section>
      {sent.length > 0 && (
        <section><h3 className="mb-2 text-sm font-semibold">Pedidos enviados</h3>
          <ul className={cn('divide-y rounded-lg border bg-card')}>{sent.map((c) => <Row key={c.id} c={c}><Button size="sm" variant="ghost" onClick={() => remove.mutate(c.id)}>Cancelar</Button></Row>)}</ul>
        </section>
      )}
    </div>
  )
}
