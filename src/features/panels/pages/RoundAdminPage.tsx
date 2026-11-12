import { ArrowLeft, Eye, Pencil, Trophy } from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardSkeleton, EmptyState, SectionCard } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn, initials } from '@/lib/utils'
import { useEvaluatorCandidates, usePitchResults, useRound, useSetEvaluator, useSetPitchStatus, type RoundDetail } from '../api'
import { CriteriaEditor } from '../components/CriteriaEditor'
import { PITCH_FLOW, PITCH_STATUS, ROUND_STATUS } from '../components/labels'
import { PitchView } from '../components/PitchView'
import { RoundFormDialog } from '../components/RoundFormDialog'

export default function RoundAdminPage() {
  const { id } = useParams()
  const { hasPermission } = useAuth()
  const { data: r, isPending } = useRound(id)
  const canManage = hasPermission('panels.manage')
  const canSeeResults = hasPermission('panels.results')
  const [editing, setEditing] = useState(false)
  if (isPending) return <CardSkeleton lines={5} />
  if (!r) return <p className="text-muted-foreground">Banca não encontrada.</p>
  const evaluated = r.pitch_submissions.some((s) => s.pitch_evaluations.some((e) => e.submitted_at))
  return (
    <div className="space-y-6">
      <Link to="/gestao/bancas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Bancas</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold sm:text-3xl">{r.name}</h1><div className="mt-1 flex gap-2"><Badge>{ROUND_STATUS[r.status]}</Badge>{r.location && <span className="text-sm text-muted-foreground">{r.location}</span>}</div></div>
        {canManage && <Button variant="outline" onClick={() => setEditing(true)}><Pencil /> Editar banca</Button>}
      </header>
      <Tabs defaultValue="submissoes">
        <TabsList>
          <TabsTrigger value="submissoes">Submissões ({r.pitch_submissions.filter((s) => s.status !== 'draft').length})</TabsTrigger>
          <TabsTrigger value="criterios">Critérios ({r.panel_criteria.length})</TabsTrigger>
          <TabsTrigger value="avaliadores">Avaliadores ({r.panel_evaluators.length})</TabsTrigger>
          {canSeeResults && <TabsTrigger value="resultados">Resultados</TabsTrigger>}
        </TabsList>
        <TabsContent value="submissoes"><Submissions round={r} canManage={canManage} /></TabsContent>
        <TabsContent value="criterios"><CriteriaEditor roundId={r.id} criteria={r.panel_criteria} editable={canManage} locked={evaluated} /></TabsContent>
        <TabsContent value="avaliadores"><Evaluators round={r} canManage={canManage} /></TabsContent>
        {canSeeResults && <TabsContent value="resultados"><Results round={r} canManage={canManage} /></TabsContent>}
      </Tabs>
      <RoundFormDialog open={editing} onOpenChange={setEditing} round={r} />
    </div>
  )
}

function Submissions({ round: r, canManage }: { round: RoundDetail; canManage: boolean }) {
  const setStatus = useSetPitchStatus()
  const [viewing, setViewing] = useState<RoundDetail['pitch_submissions'][number] | null>(null)
  const list = r.pitch_submissions.filter((s) => s.status !== 'draft')
  const drafts = r.pitch_submissions.length - list.length
  if (!list.length) return <EmptyState text={drafts ? `${drafts} pitch(es) em rascunho; nenhum submetido ainda.` : 'Nenhum pitch submetido.'} />
  return (
    <div className="space-y-3">
      {drafts > 0 && <p className="text-sm text-muted-foreground">{drafts} pitch(es) ainda em rascunho.</p>}
      <ul className="divide-y rounded-lg border bg-card">
        {list.map((s) => {
          const done = s.pitch_evaluations.filter((e) => e.submitted_at).length
          return (
            <li key={s.id} className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.venture?.name} <span className="font-normal text-muted-foreground">· {s.venture?.owner?.full_name}</span></p>
                <p className="text-xs text-muted-foreground">{done}/{r.panel_evaluators.length} avaliações enviadas{s.panel_at ? ` · apresentação ${format(new Date(s.panel_at), 'dd/MM HH:mm')}` : ''}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setViewing(s)}><Eye /> Ver pitch</Button>
              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  <Select className={cn('h-8 w-44 text-xs')} value={s.status} aria-label={`Status de ${s.venture?.name}`}
                    onChange={(e) => setStatus.mutate({ id: s.id, status: e.target.value as typeof s.status }, { onSuccess: () => toast.success('Status atualizado.'), onError: (er) => toast.error(er.message) })}>
                    {PITCH_FLOW.filter((x) => x !== 'draft').map((x) => <option key={x} value={x}>{PITCH_STATUS[x].label}</option>)}
                  </Select>
                  <Input type="datetime-local" className="h-8 w-48 text-xs" aria-label="Horário da apresentação"
                    defaultValue={s.panel_at ? format(new Date(s.panel_at), "yyyy-MM-dd'T'HH:mm") : ''}
                    onBlur={(e) => { const v = e.target.value ? new Date(e.target.value).toISOString() : null; if (v !== s.panel_at) setStatus.mutate({ id: s.id, status: v ? 'panel_scheduled' : s.status, panelAt: v }, { onSuccess: () => toast.success('Apresentação agendada.') }) }} />
                </div>
              ) : <Badge variant={PITCH_STATUS[s.status].variant}>{PITCH_STATUS[s.status].label}</Badge>}
            </li>
          )
        })}
      </ul>
      {viewing && (
        <Dialog open onOpenChange={(o) => !o && setViewing(null)}>
          <DialogContent title="Pitch" className="sm:max-w-4xl"><PitchView pitch={viewing} /></DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function Evaluators({ round: r, canManage }: { round: RoundDetail; canManage: boolean }) {
  const candidates = useEvaluatorCandidates()
  const set = useSetEvaluator(r.id)
  const current = new Set(r.panel_evaluators.map((e) => e.user?.id))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {r.panel_evaluators.map((e) => e.user && (
          <span key={e.user.id} className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm">
            <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{initials(e.user.full_name)}</AvatarFallback></Avatar>{e.user.full_name}
          </span>
        ))}
        {!r.panel_evaluators.length && <p className="text-sm text-muted-foreground">Nenhum avaliador definido.</p>}
      </div>
      {canManage && (
        <SectionCard title="Escolher avaliadores">
          <div className="flex flex-wrap gap-2">
            {candidates.data?.map((c) => (
              <button key={c.id} onClick={() => set.mutate({ userId: c.id, add: !current.has(c.id) }, { onError: (er) => toast.error(er.message) })}
                className={cn('rounded-full border px-3 py-1.5 text-xs font-medium', current.has(c.id) ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary')}>
                {c.full_name} <span className="opacity-70">· {c.role}</span>
              </button>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

/** Confidential: only panels.results. Weighted average on a 0–10 scale. */
function Results({ round: r, canManage }: { round: RoundDetail; canManage: boolean }) {
  const { data, isPending } = usePitchResults(r.id, true)
  const setStatus = useSetPitchStatus()
  if (isPending) return <CardSkeleton />
  if (!data?.ranking.length) return <EmptyState text="Sem avaliações ainda." />
  const criteria = [...r.panel_criteria].sort((a, b) => a.sort_order - b.sort_order)
  const submissions = new Map(r.pitch_submissions.map((s) => [s.id, s]))
  const avg = (subId: string, critId: string) => {
    const vals = data.evaluations.filter((e) => e.submission_id === subId && e.submitted_at).flatMap((e) => e.pitch_scores.filter((s) => s.criterion_id === critId).map((s) => Number(s.score)))
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—'
  }
  return (
    <div className="space-y-6">
      <p className="flex items-center gap-2 rounded-md bg-warning/10 p-3 text-sm text-warning"><Eye className="h-4 w-4" />Resultado confidencial: visível apenas para quem tem permissão de resultados de banca.</p>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-4 py-2.5">#</th><th className="px-3 py-2.5">Negócio</th><th className="px-3 py-2.5 text-right">Nota</th><th className="px-3 py-2.5 text-right">Aval.</th>
              {criteria.map((c) => <th key={c.id} className="px-2 py-2.5 text-right" title={c.name}>{c.name.slice(0, 10)}</th>)}{canManage && <th className="px-3 py-2.5">Decisão</th>}</tr>
          </thead>
          <tbody className="divide-y">
            {data.ranking.map((row, i) => {
              const s = submissions.get(row.submission_id)
              return (
                <tr key={row.submission_id}>
                  <td className="px-4 py-3 font-semibold">{i === 0 && row.weighted_score !== null ? <Trophy className="h-4 w-4 text-warning" /> : i + 1}</td>
                  <td className="px-3 py-3 font-medium">{row.venture_name}</td>
                  <td className="px-3 py-3 text-right font-display text-lg font-semibold tabular-nums">{row.weighted_score ?? '—'}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{row.evaluations}</td>
                  {criteria.map((c) => <td key={c.id} className="px-2 py-3 text-right tabular-nums text-muted-foreground">{avg(row.submission_id, c.id)}</td>)}
                  {canManage && s && (
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant={s.status === 'selected' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setStatus.mutate({ id: s.id, status: 'selected' }, { onSuccess: () => toast.success('Marcado como selecionado.') })}>Selecionar</Button>
                        <Button size="sm" variant={s.status === 'not_selected' ? 'destructive' : 'outline'} className="h-7 text-xs" onClick={() => setStatus.mutate({ id: s.id, status: 'not_selected' })}>Não</Button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <SectionCard title="Comentários dos avaliadores">
        <ul className="space-y-3">
          {data.evaluations.filter((e) => e.submitted_at && e.general_comment).map((e) => (
            <li key={e.id} className="rounded-md bg-secondary/50 p-3 text-sm">
              <p className="text-xs font-semibold">{e.evaluator?.full_name} sobre {submissions.get(e.submission_id)?.venture?.name}</p>
              <p className="mt-1 whitespace-pre-line">{e.general_comment}</p>
            </li>
          ))}
          {!data.evaluations.some((e) => e.submitted_at && e.general_comment) && <li className="text-sm text-muted-foreground">Sem comentários.</li>}
        </ul>
      </SectionCard>
    </div>
  )
}
