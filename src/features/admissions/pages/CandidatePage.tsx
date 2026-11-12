import { ArrowLeft, CheckCircle2, Mail, MapPin, Pencil, Phone, Plus, UserPlus } from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CardSkeleton, EmptyState, SectionCard } from '@/components/shared/SectionCard'
import { TRACK_LABEL } from '@/config/labels'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'
import {
  ADMISSION_COLUMNS, admissionLabel, DECISION_LABEL, RECOMMENDATION_LABEL, useMoveCandidate, useCandidate, useCohortOptions,
  useConvertCandidate, useSaveInterview, useSaveReview, type AdmissionStatus, type TemplateField,
} from '../api'
import { CandidateFormDialog } from '../components'

type Data = NonNullable<ReturnType<typeof useCandidate>['data']>

export default function CandidatePage() {
  const { id } = useParams()
  const { hasPermission, user } = useAuth()
  const committee = hasPermission('admissions.committee')
  const manage = hasPermission('admissions.manage')
  const { data, isPending } = useCandidate(id, committee)
  if (isPending) return <CardSkeleton lines={5} />
  if (!data || !id) return <p className="text-muted-foreground">Candidato não encontrado ou sem acesso.</p>
  const c = data.candidate
  return (
    <div className="space-y-6">
      <Link to="/gestao/admissoes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Admissões</Link>
      <Card><CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-semibold">{c.full_name}</h1>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={c.status === 'approved' || c.status === 'enrolled' ? 'success' : c.status === 'rejected' ? 'destructive' : 'default'}>{admissionLabel(c.status)}</Badge>
            {c.profile_type && <Badge variant="accent">{TRACK_LABEL[c.profile_type]}</Badge>}
            {c.target_cohort && <Badge variant="secondary">{c.target_cohort.name}</Badge>}
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {c.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{c.email}</span>}
            {c.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{c.phone}</span>}
            {c.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.city}</span>}
          </p>
        </div>
        {manage && <div className="flex flex-wrap gap-2"><CandidateFormDialog candidate={c} trigger={<Button variant="outline"><Pencil />Editar</Button>} /><StatusDialog id={id} current={c.status} /></div>}
      </CardContent></Card>

      {c.converted_user_id ? (
        <Card className="border-success/40 bg-success/5"><CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" />Convertido em Neoleader {c.converted_at && `em ${format(new Date(c.converted_at), 'dd/MM/yyyy')}`}.</span>
          <Button asChild variant="outline" size="sm"><Link to={`/gestao/neoleaders/${c.converted_user_id}`}>Abrir Perfil 360º</Link></Button>
        </CardContent></Card>
      ) : manage && (c.status === 'approved' || c.status === 'waitlist') ? <ConvertCard data={data} /> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] [&>*]:min-w-0">
        <div className="space-y-6">
          <SectionCard title="Inscrição">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {([['Empresa / negócio', c.company], ['Momento empreendedor', c.entrepreneurial_stage], ['Origem', c.lead_source], ['Responsável', c.owner?.full_name],
                ['Objetivos', c.goals], ['Experiência', c.experience], ['Observações internas', c.notes]] as const).map(([k, v]) => (
                <div key={k} className={cn(k.length > 0 && ['Objetivos', 'Experiência', 'Observações internas'].includes(k) && 'sm:col-span-2')}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="whitespace-pre-line">{v || '—'}</dd></div>
              ))}
            </dl>
          </SectionCard>
          <SectionCard title="Entrevista de alinhamento" extra={manage || hasPermission('admissions.view') ? <InterviewDialog data={data} interviewerId={user?.user_id ?? ''} /> : undefined}>
            {!data.interviews.length ? <EmptyState text="Nenhuma entrevista registrada." /> : (
              <ul className="space-y-4">{data.interviews.map((i) => {
                const fields = (i.template?.fields ?? []) as unknown as TemplateField[]
                const answers = i.answers as Record<string, unknown>
                return (
                  <li key={i.id} className="rounded-lg border p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{i.interviewer?.full_name ?? '—'} <span className="font-normal text-muted-foreground">· {i.completed_at ? `realizada ${format(new Date(i.completed_at), 'dd/MM/yyyy')}` : i.scheduled_at ? `agendada ${format(new Date(i.scheduled_at), "dd/MM 'às' HH:mm")}` : 'rascunho'}</span></p>
                      {i.recommendation && <Badge variant={i.recommendation === 'advance' ? 'success' : i.recommendation === 'reject' ? 'destructive' : 'warning'}>{RECOMMENDATION_LABEL[i.recommendation]}</Badge>}
                    </div>
                    <dl className="mt-3 space-y-2">{fields.filter((f) => answers[f.key] !== undefined && answers[f.key] !== '').map((f) => (
                      <div key={f.key}><dt className="text-xs text-muted-foreground">{f.label}</dt><dd className="whitespace-pre-line">{f.type === 'boolean' ? (answers[f.key] ? 'Sim' : 'Não') : f.type === 'scale' ? `${String(answers[f.key])} / ${f.max ?? 5}` : String(answers[f.key])}</dd></div>
                    ))}</dl>
                    {i.summary && <p className="mt-3 border-t pt-3"><span className="text-muted-foreground">Parecer: </span>{i.summary}</p>}
                  </li>
                )
              })}</ul>
            )}
          </SectionCard>
        </div>
        <div className="space-y-6">
          {committee && <CommitteeCard data={data} me={user?.user_id ?? ''} />}
          <SectionCard title="Histórico">
            <ol className="relative space-y-3 border-l-2 border-border pl-5 text-sm">{data.history.map((h) => (
              <li key={h.id} className="relative"><span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                <p className="font-medium">{admissionLabel(h.to_status)}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(h.changed_at), "dd/MM/yyyy HH:mm")}{h.by?.full_name ? ` · ${h.by.full_name}` : ''}</p>
              </li>
            ))}</ol>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

function StatusDialog({ id, current }: { id: string; current: AdmissionStatus }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<AdmissionStatus>(current)
  const m = useMoveCandidate()
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setStatus(current) }}>
      <Button onClick={() => setOpen(true)}>Mover etapa</Button>
      <DialogContent title="Mover candidato de etapa" description="A mudança fica registrada no histórico com data e responsável.">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); m.mutate({ candidateId: id, status }, { onSuccess: () => { toast.success('Etapa atualizada.'); setOpen(false) }, onError: (er) => toast.error(er.message) }) }}>
          <FormField id="st" label="Nova etapa"><Select id="st" value={status} onChange={(e) => setStatus(e.target.value as AdmissionStatus)}>{ADMISSION_COLUMNS.filter((c) => c.key !== 'enrolled').map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</Select></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={m.isPending || status === current}>Confirmar</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function InterviewDialog({ data, interviewerId }: { data: Data; interviewerId: string }) {
  const tpl = data.templates[0]
  const [open, setOpen] = useState(false)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [summary, setSummary] = useState('')
  const [rec, setRec] = useState<'' | 'advance' | 'hold' | 'reject'>('')
  const m = useSaveInterview()
  if (!tpl) return null
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const missing = tpl.fields.find((f) => f.required && (answers[f.key] === undefined || answers[f.key] === ''))
    if (missing) return toast.error(`Preencha: ${missing.label}`)
    m.mutate({ candidate_id: data.candidate.id, template_id: tpl.id, interviewer_id: interviewerId, answers, summary, recommendation: rec || null, complete: true },
      { onSuccess: () => { toast.success('Entrevista registrada.'); setOpen(false) }, onError: (er) => toast.error(er.message) })
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setAnswers({}); setSummary(''); setRec('') } }}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus />Registrar</Button>
      <DialogContent title={tpl.name} description={`Candidato: ${data.candidate.full_name}`} className="sm:max-w-2xl">
        <form className="space-y-4" onSubmit={submit}>
          {tpl.fields.map((f) => {
            const fid = `iv-${f.key}`
            const label = <>{f.label}{f.required && <span className="text-destructive"> *</span>}</>
            const val = answers[f.key]
            const put = (x: unknown) => setAnswers((p) => ({ ...p, [f.key]: x }))
            if (f.type === 'boolean') return <label key={f.key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(val)} onChange={(e) => put(e.target.checked)} className="h-4 w-4 accent-primary" />{f.label}</label>
            if (f.type === 'scale') {
              const min = f.min ?? 1, max = f.max ?? 5
              return <FormField key={f.key} id={fid} label={label}><div className="flex gap-1.5" role="radiogroup" aria-label={f.label}>{Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
                <button type="button" key={n} role="radio" aria-checked={val === n} onClick={() => put(n)} className={cn('h-9 w-9 rounded-md border text-sm font-medium', val === n ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary')}>{n}</button>
              ))}</div></FormField>
            }
            if (f.type === 'select') return <FormField key={f.key} id={fid} label={label}><Select id={fid} value={String(val ?? '')} onChange={(e) => put(e.target.value)}><option value="">—</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</Select></FormField>
            if (f.type === 'textarea') return <FormField key={f.key} id={fid} label={label}><Textarea id={fid} rows={3} value={String(val ?? '')} onChange={(e) => put(e.target.value)} /></FormField>
            return <FormField key={f.key} id={fid} label={label}><Input id={fid} value={String(val ?? '')} onChange={(e) => put(e.target.value)} /></FormField>
          })}
          <FormField id="iv-summary" label="Parecer do entrevistador"><Textarea id="iv-summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} /></FormField>
          <FormField id="iv-rec" label="Recomendação"><Select id="iv-rec" value={rec} onChange={(e) => setRec(e.target.value as typeof rec)}><option value="">—</option>{Object.entries(RECOMMENDATION_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></FormField>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={m.isPending}>Salvar entrevista</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CommitteeCard({ data, me }: { data: Data; me: string }) {
  const mine = data.reviews.find((r) => r.reviewer_id === me)
  const [score, setScore] = useState(mine?.score?.toString() ?? '')
  const [decision, setDecision] = useState<'' | 'approve' | 'waitlist' | 'reject'>(mine?.decision ?? '')
  const [comment, setComment] = useState(mine?.comment ?? '')
  const m = useSaveReview()
  const scores = data.reviews.map((r) => r.score).filter((x): x is number => x !== null)
  const avg = scores.length ? scores.reduce((a, b) => a + Number(b), 0) / scores.length : null
  const closed = ['enrolled', 'rejected'].includes(data.candidate.status)
  return (
    <SectionCard title="Avaliação do Comitê">
      <p className="text-sm text-muted-foreground">{data.reviews.length} avaliação(ões){avg !== null && <> · média <strong className="text-foreground">{avg.toFixed(1)}</strong></>}</p>
      <ul className="mt-3 space-y-2 text-sm">{data.reviews.map((r) => (
        <li key={r.id} className="rounded-md border p-2.5"><div className="flex justify-between gap-2"><span className="font-medium">{r.reviewer?.full_name}</span>
          <Badge variant={r.decision === 'approve' ? 'success' : r.decision === 'reject' ? 'destructive' : 'warning'}>{DECISION_LABEL[r.decision]}{r.score !== null ? ` · ${r.score}` : ''}</Badge></div>
          {r.comment && <p className="mt-1 text-muted-foreground">{r.comment}</p>}</li>
      ))}</ul>
      {!closed && (
        <form className="mt-4 space-y-3 border-t pt-4" onSubmit={(e) => {
          e.preventDefault(); if (!decision) return toast.error('Escolha uma decisão.')
          const n = score === '' ? null : Number(score.replace(',', '.'))
          if (n !== null && (Number.isNaN(n) || n < 0 || n > 10)) return toast.error('Nota entre 0 e 10.')
          m.mutate({ candidate_id: data.candidate.id, reviewer_id: me, score: n, decision, comment }, { onSuccess: () => toast.success('Avaliação registrada.'), onError: (er) => toast.error(er.message) })
        }}>
          <p className="text-sm font-medium">{mine ? 'Sua avaliação' : 'Avaliar candidato'}</p>
          <div className="grid grid-cols-2 gap-2">
            <FormField id="cm-score" label="Nota (0–10)"><Input id="cm-score" inputMode="decimal" value={score} onChange={(e) => setScore(e.target.value)} /></FormField>
            <FormField id="cm-dec" label="Decisão"><Select id="cm-dec" value={decision} onChange={(e) => setDecision(e.target.value as typeof decision)}><option value="">—</option>{Object.entries(DECISION_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></FormField>
          </div>
          <FormField id="cm-comment" label="Comentário"><Textarea id="cm-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} /></FormField>
          <Button type="submit" size="sm" disabled={m.isPending}>{mine ? 'Atualizar avaliação' : 'Enviar avaliação'}</Button>
        </form>
      )}
    </SectionCard>
  )
}

function ConvertCard({ data }: { data: Data }) {
  const c = data.candidate
  const cohorts = useCohortOptions()
  const [cohort, setCohort] = useState(c.target_cohort_id ?? '')
  const [email, setEmail] = useState(c.email ?? '')
  const m = useConvertCandidate()
  return (
    <Card className="border-primary/40 bg-primary/5"><CardContent className="space-y-3 pt-6">
      <div className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /><h2 className="font-display font-semibold">Transformar candidato em Neoleader</h2></div>
      <p className="text-sm text-muted-foreground">Cria o acesso, envia o convite por e-mail e aproveita os dados da inscrição (perfil, trilha, objetivos, empresa e matrícula) sem redigitar.</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <FormField id="cv-email" label="E-mail de acesso"><Input id="cv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></FormField>
        <FormField id="cv-cohort" label="Turma"><Select id="cv-cohort" value={cohort} onChange={(e) => setCohort(e.target.value)}><option value="">Selecione</option>{cohorts.data?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></FormField>
        <Button disabled={!email || !cohort || m.isPending} onClick={() => {
          if (!window.confirm(`Enviar convite para ${email} e matricular ${c.full_name}?`)) return
          m.mutate({ candidate_id: c.id, email, full_name: c.full_name, cohort_id: cohort }, { onSuccess: () => toast.success('Convite enviado. Candidato matriculado como Neoleader.'), onError: (er) => toast.error(er.message) })
        }}>{m.isPending ? 'Enviando…' : 'Converter e convidar'}</Button>
      </div>
    </CardContent></Card>
  )
}
