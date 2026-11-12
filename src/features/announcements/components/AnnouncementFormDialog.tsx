import { format } from 'date-fns'
import { Loader2, Paperclip, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'
import type { StoredFile } from '@/lib/storage'
import { useAudienceOptions, useSaveAnnouncement, type AnnouncementRow, type AnnouncementType, type Target } from '../api'
import { TYPE } from './labels'

type Kind = 'all' | 'cohort' | 'subject' | 'role' | 'user'

export function AnnouncementFormDialog({ open, onOpenChange, announcement, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; announcement?: AnnouncementRow | null; onSaved?: (id: string) => void }) {
  const { user, hasPermission } = useAuth()
  const opts = useAudienceOptions()
  const save = useSaveAnnouncement()
  const fullAccess = hasPermission('communications.create')
  const [v, setV] = useState({ title: '', body: '', type: 'institutional' as AnnouncementType, when: 'now', at: '', pinned: false, ack: false, draft: false })
  const [targets, setTargets] = useState<Target[]>([])
  const [kind, setKind] = useState<Kind>(fullAccess ? 'all' : 'subject')
  const [keep, setKeep] = useState<StoredFile[]>([])
  const [files, setFiles] = useState<File[]>([])
  useEffect(() => {
    if (!open) return
    const a = announcement
    setV({ title: a?.title ?? '', body: a?.body ?? '', type: a?.type ?? (fullAccess ? 'institutional' : 'academic'), when: a && new Date(a.publish_at) > new Date() ? 'schedule' : 'now',
      at: a ? format(new Date(a.publish_at), "yyyy-MM-dd'T'HH:mm") : '', pinned: a?.is_pinned ?? false, ack: a?.requires_ack ?? false, draft: a?.status === 'draft' })
    setTargets(a?.announcement_targets ?? (fullAccess ? [{ target_type: 'all', target_id: null, role_key: null }] : []))
    setKeep(a?.attachments ?? []); setFiles([])
  }, [open, announcement, fullAccess])

  const subjects = (opts.data?.subjects ?? []).filter((s) => fullAccess || s.subject_teachers.some((t) => t.user_id === user?.user_id))
  const choices: Record<Exclude<Kind, 'all'>, { id: string; label: string }[]> = {
    cohort: (opts.data?.cohorts ?? []).map((c) => ({ id: c.id, label: c.name })),
    subject: subjects.map((s) => ({ id: s.id, label: `${s.name} (${s.code})` })),
    role: (opts.data?.roles ?? []).map((r) => ({ id: r.key, label: r.name })),
    user: (opts.data?.people ?? []).map((p) => ({ id: p.id, label: p.full_name })),
  }
  const has = (t: Target) => targets.some((x) => x.target_type === t.target_type && x.target_id === t.target_id && x.role_key === t.role_key)
  const toggle = (t: Target) => setTargets(has(t) ? targets.filter((x) => !(x.target_type === t.target_type && x.target_id === t.target_id && x.role_key === t.role_key)) : [...targets.filter((x) => x.target_type !== 'all'), t])
  const label = (t: Target) => t.target_type === 'all' ? 'Todos' : t.target_type === 'role' ? choices.role.find((c) => c.id === t.role_key)?.label : choices[t.target_type as 'cohort']?.find((c) => c.id === t.target_id)?.label

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (v.title.trim().length < 3 || !v.body.trim()) return toast.error('Informe título e mensagem.')
    if (!targets.length) return toast.error('Escolha para quem enviar.')
    if (v.when === 'schedule' && (!v.at || new Date(v.at) <= new Date())) return toast.error('Escolha uma data futura para o agendamento.')
    try {
      const id = await save.mutateAsync({
        id: announcement?.id, targets, keep, files,
        fields: { title: v.title.trim(), body: v.body.trim(), type: v.type, status: v.draft ? 'draft' : 'published', publish_at: v.when === 'schedule' ? new Date(v.at).toISOString() : new Date().toISOString(), is_pinned: v.pinned, requires_ack: v.ack },
      })
      toast.success(v.draft ? 'Rascunho salvo.' : v.when === 'schedule' ? 'Comunicado agendado.' : 'Comunicado publicado. As notificações saem em até 10 minutos.')
      onOpenChange(false); onSaved?.(id)
    } catch (er) { toast.error(er instanceof Error ? er.message : String(er)) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={announcement ? 'Editar comunicado' : 'Novo comunicado'} className="sm:max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
            <FormField id="an-title" label="Título"><Input id="an-title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></FormField>
            <FormField id="an-type" label="Tipo"><Select id="an-type" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value as AnnouncementType })}>{Object.entries(TYPE).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</Select></FormField>
          </div>
          <FormField id="an-body" label="Mensagem"><Textarea id="an-body" rows={5} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} /></FormField>
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">Para quem</p>
            <div className="flex flex-wrap gap-1.5">{targets.map((t, i) => <span key={i} className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs text-primary-foreground">{label(t) ?? '…'}<button type="button" onClick={() => toggle(t)} aria-label="Remover destino"><X className="h-3 w-3" /></button></span>)}</div>
            <div className="flex flex-wrap gap-1.5">
              {(fullAccess ? ['all', 'cohort', 'subject', 'role', 'user'] as Kind[] : ['subject'] as Kind[]).map((k) => (
                <button type="button" key={k} onClick={() => k === 'all' ? setTargets([{ target_type: 'all', target_id: null, role_key: null }]) : setKind(k)}
                  className={cn('rounded-md border px-2.5 py-1 text-xs', kind === k && k !== 'all' ? 'border-primary text-primary' : 'hover:bg-secondary')}>
                  {{ all: 'Todos', cohort: 'Turma', subject: 'Disciplina', role: 'Cargo', user: 'Usuário' }[k]}
                </button>
              ))}
            </div>
            {kind !== 'all' && (
              <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                {choices[kind].map((c) => {
                  const t: Target = kind === 'role' ? { target_type: 'role', target_id: null, role_key: c.id } : { target_type: kind, target_id: c.id, role_key: null }
                  return <button type="button" key={c.id} onClick={() => toggle(t)} className={cn('rounded-full border px-2.5 py-1 text-xs', has(t) ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-secondary')}>{c.label}</button>
                })}
                {!choices[kind].length && <p className="text-xs text-muted-foreground">Nenhuma opção disponível.</p>}
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="an-when" label="Publicação">
              <Select id="an-when" value={v.when} onChange={(e) => setV({ ...v, when: e.target.value })}><option value="now">Publicar agora</option><option value="schedule">Agendar</option></Select>
            </FormField>
            {v.when === 'schedule' && <FormField id="an-at" label="Data e hora"><Input id="an-at" type="datetime-local" value={v.at} onChange={(e) => setV({ ...v, at: e.target.value })} /></FormField>}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={v.pinned} onChange={(e) => setV({ ...v, pinned: e.target.checked })} />Fixar no topo</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={v.ack} onChange={(e) => setV({ ...v, ack: e.target.checked })} />Exigir confirmação de leitura</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={v.draft} onChange={(e) => setV({ ...v, draft: e.target.checked })} />Salvar como rascunho</label>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {keep.map((f) => <span key={f.path} className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">{f.name}<button type="button" onClick={() => setKeep(keep.filter((k) => k.path !== f.path))} aria-label="Remover anexo"><X className="h-3 w-3" /></button></span>)}
            {files.map((f, i) => <span key={i} className="flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs">{f.name}<button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Remover anexo"><X className="h-3 w-3" /></button></span>)}
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-secondary"><Paperclip className="h-3.5 w-3.5" />Anexar
              <input type="file" multiple className="sr-only" onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])])} /></label>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="animate-spin" />}{v.draft ? 'Salvar' : v.when === 'schedule' ? 'Agendar' : 'Publicar'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
