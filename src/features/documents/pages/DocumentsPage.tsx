import { CheckCircle2, Download, Eye, FileSignature, FileText, Loader2, Plus, Search, Upload, Users } from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { useAudienceOptions } from '@/features/announcements/api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { fmtBytes, signedUrl } from '@/lib/storage'
import { cn } from '@/lib/utils'
import { useAcknowledge, useDocumentRecipients, useDocuments, useUploadDocument, type DocCategory, type DocRow, type DocStatus, type DocTarget } from '../api'

const CATEGORY: Record<DocCategory, string> = { academic: 'Acadêmico', administrative: 'Administrativo', contract: 'Contrato', term: 'Termo', certificate: 'Certificado', material: 'Material', project: 'Projeto', financial: 'Financeiro', other: 'Outro' }
const STATUS: Record<DocStatus, { label: string; variant: 'secondary' | 'warning' | 'destructive' | 'outline' }> = {
  available: { label: 'Disponível', variant: 'secondary' }, required_reading: { label: 'Leitura obrigatória', variant: 'warning' },
  signature_pending: { label: 'Assinatura pendente', variant: 'destructive' }, expired: { label: 'Expirado', variant: 'outline' },
}

export default function DocumentsPage() {
  const { user, hasPermission } = useAuth()
  const { data, isPending } = useDocuments(user?.user_id)
  const ack = useAcknowledge()
  const canUpload = hasPermission('documents.upload')
  const [cat, setCat] = useState<DocCategory | ''>('')
  const [onlyPending, setOnlyPending] = useState(false)
  const [q, setQ] = useState('')
  const [preview, setPreview] = useState<{ doc: DocRow; url: string } | null>(null)
  const [uploading, setUploading] = useState<DocRow | null | undefined>(undefined)
  const [recipients, setRecipients] = useState<DocRow | null>(null)
  if (!user) return null
  const list = (data ?? []).filter((d) => (!cat || d.category === cat) && (!onlyPending || d.pending) && (!q || d.title.toLowerCase().includes(q.toLowerCase())))
  const pendingCount = (data ?? []).filter((d) => d.pending).length

  const open = async (d: DocRow, download = false) => {
    if (!d.latest) return toast.error('Documento sem arquivo.')
    try {
      const url = await signedUrl('documents', d.latest.storage_path)
      if (!d.readAt && d.status !== 'signature_pending') ack.mutate({ documentId: d.id, userId: user.user_id })
      if (download || !(d.latest.mime_type?.includes('pdf') || d.latest.mime_type?.startsWith('image/'))) window.open(url, '_blank', 'noopener')
      else setPreview({ doc: d, url })
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)) }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold sm:text-3xl">Documentos</h1><p className="mt-1 text-muted-foreground">Contratos, termos, certificados e materiais oficiais, em armazenamento privado.</p></div>
        {canUpload && <Button onClick={() => setUploading(null)}><Plus /> Novo documento</Button>}
      </header>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar documento" /></div>
        <button onClick={() => setOnlyPending(!onlyPending)} className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', onlyPending ? 'border-destructive bg-destructive text-destructive-foreground' : 'hover:bg-secondary')}>Pendentes de ação ({pendingCount})</button>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={cat} onChange={(e) => setCat(e.target.value as DocCategory | '')} aria-label="Categoria">
          <option value="">Todas as categorias</option>{Object.entries(CATEGORY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      {isPending ? <CardSkeleton lines={4} /> : !list.length ? <EmptyState text="Nenhum documento." /> : (
        <ul className="divide-y rounded-lg border bg-card">
          {list.map((d) => {
            const st = d.expired ? STATUS.expired : STATUS[d.status]
            const manage = hasPermission('documents.manage') || d.created_by === user.user_id
            return (
              <li key={d.id} className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md', d.pending ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary')}>
                    {d.status === 'signature_pending' ? <FileSignature className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{d.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {[CATEGORY[d.category], d.latest && `v${d.latest.version}`, d.latest && fmtBytes(d.latest.size_bytes), format(new Date(d.updated_at), 'dd/MM/yyyy'), d.author?.full_name && `por ${d.author.full_name}`, d.owner && `de ${d.owner.full_name}`].filter(Boolean).join(' · ')}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {d.status !== 'available' && <Badge variant={st.variant}>{st.label}</Badge>}
                      {d.signedAt ? <Badge variant="success"><CheckCircle2 className="h-3 w-3" />Assinado</Badge> : d.readAt && d.status === 'required_reading' ? <Badge variant="success"><CheckCircle2 className="h-3 w-3" />Lido</Badge> : null}
                      {!d.latest && <Badge variant="outline">Sem arquivo</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {d.latest && <Button size="sm" variant="outline" onClick={() => void open(d)}><Eye /> Visualizar</Button>}
                  {d.latest && <Button size="sm" variant="ghost" onClick={() => void open(d, true)} aria-label="Baixar"><Download /></Button>}
                  {d.pending && d.status === 'required_reading' && <Button size="sm" onClick={() => ack.mutate({ documentId: d.id, userId: user.user_id }, { onSuccess: () => toast.success('Leitura confirmada.') })}>Confirmo a leitura</Button>}
                  {d.pending && d.status === 'signature_pending' && <Button size="sm" onClick={() => { if (confirm(`Assinar eletronicamente "${d.title}"? Fica registrado data, hora e seu usuário.`)) ack.mutate({ documentId: d.id, userId: user.user_id, sign: true }, { onSuccess: () => toast.success('Documento assinado.') }) }}><FileSignature /> Assinar</Button>}
                  {manage && <Button size="sm" variant="ghost" onClick={() => setUploading(d)}><Upload /> Nova versão</Button>}
                  {manage && <Button size="sm" variant="ghost" onClick={() => setRecipients(d)} aria-label="Quem leu"><Users /></Button>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {preview && (
        <Dialog open onOpenChange={(o) => !o && setPreview(null)}>
          <DialogContent title={preview.doc.title} className="sm:max-w-4xl">
            {preview.doc.latest?.mime_type?.startsWith('image/') ? <img src={preview.url} alt={preview.doc.title} className="max-h-[70dvh] w-full object-contain" />
              : <iframe src={preview.url} title={preview.doc.title} className="h-[70dvh] w-full rounded-md border" />}
          </DialogContent>
        </Dialog>
      )}
      {uploading !== undefined && <UploadDialog existing={uploading} onClose={() => setUploading(undefined)} />}
      {recipients && <RecipientsDialog doc={recipients} onClose={() => setRecipients(null)} />}
    </div>
  )
}

function UploadDialog({ existing, onClose }: { existing: DocRow | null; onClose: () => void }) {
  const upload = useUploadDocument()
  const opts = useAudienceOptions()
  const [file, setFile] = useState<File | null>(null)
  const [v, setV] = useState({ title: '', description: '', category: 'academic' as DocCategory, status: 'available' as DocStatus, expires: '', audience: 'all', target: '' })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={existing ? `Nova versão · ${existing.title}` : 'Novo documento'}>
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault()
          if (!file) return toast.error('Escolha o arquivo.')
          if (!existing && v.title.trim().length < 3) return toast.error('Informe o título.')
          const personal = v.audience === 'person'
          const targets: DocTarget[] = existing || personal ? [] : v.audience === 'all' ? [{ target_type: 'all', target_id: null, role_key: null }]
            : v.audience === 'role' ? [{ target_type: 'role', target_id: null, role_key: v.target }] : [{ target_type: v.audience as 'cohort', target_id: v.target, role_key: null }]
          upload.mutate({ existing: existing ?? undefined, file, targets, fields: existing ? undefined : {
            title: v.title.trim(), description: v.description || null, category: v.category, status: v.status, owner_user_id: personal ? v.target || null : null,
            expires_at: v.expires ? new Date(v.expires).toISOString() : null, requires_signature: v.status === 'signature_pending' } },
            { onSuccess: () => { toast.success(existing ? 'Nova versão publicada.' : 'Documento publicado. Os destinatários serão notificados.'); onClose() }, onError: (er) => toast.error(er.message) })
        }}>
          {!existing && <>
            <FormField id="d-title" label="Título"><Input id="d-title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></FormField>
            <FormField id="d-desc" label="Descrição"><Textarea id="d-desc" rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="d-cat" label="Categoria"><Select id="d-cat" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value as DocCategory })}>{Object.entries(CATEGORY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></FormField>
              <FormField id="d-status" label="Status"><Select id="d-status" value={v.status} onChange={(e) => setV({ ...v, status: e.target.value as DocStatus })}>{Object.entries(STATUS).filter(([k]) => k !== 'expired').map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</Select></FormField>
              <FormField id="d-aud" label="Para quem">
                <Select id="d-aud" value={v.audience} onChange={(e) => setV({ ...v, audience: e.target.value, target: '' })}>
                  <option value="all">Todos</option><option value="cohort">Uma turma</option><option value="role">Um cargo</option><option value="person">Documento pessoal de alguém</option>
                </Select>
              </FormField>
              {v.audience !== 'all' && (
                <FormField id="d-target" label={v.audience === 'cohort' ? 'Turma' : v.audience === 'role' ? 'Cargo' : 'Pessoa'}>
                  <Select id="d-target" value={v.target} onChange={(e) => setV({ ...v, target: e.target.value })}>
                    <option value="">Selecione…</option>
                    {v.audience === 'cohort' && opts.data?.cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    {v.audience === 'role' && opts.data?.roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                    {v.audience === 'person' && opts.data?.people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </Select>
                </FormField>
              )}
              <FormField id="d-exp" label="Expira em (opcional)"><Input id="d-exp" type="date" value={v.expires} onChange={(e) => setV({ ...v, expires: e.target.value })} /></FormField>
            </div>
          </>}
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm hover:bg-secondary/50">
            <Upload className="h-5 w-5 text-muted-foreground" />{file ? <span className="font-medium">{file.name} · {fmtBytes(file.size)}</span> : <span className="text-muted-foreground">Escolher arquivo (até 50 MB)</span>}
            <input type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={upload.isPending}>{upload.isPending && <Loader2 className="animate-spin" />}Publicar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RecipientsDialog({ doc, onClose }: { doc: DocRow; onClose: () => void }) {
  const { data, isPending } = useDocumentRecipients(doc.id)
  const read = data?.filter((r) => r.read_at).length ?? 0
  const signed = data?.filter((r) => r.signed_at).length ?? 0
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={doc.title} description={`${data?.length ?? 0} destinatários · ${read} leram${doc.status === 'signature_pending' ? ` · ${signed} assinaram` : ''}`}>
        {isPending ? <CardSkeleton /> : (
          <ul className="max-h-96 space-y-1.5 overflow-y-auto text-sm">
            {data?.map((r) => (
              <li key={r.user_id} className="flex items-center justify-between gap-2">
                <span>{r.full_name}</span>
                {r.signed_at ? <Badge variant="success">Assinou {format(new Date(r.signed_at), 'dd/MM')}</Badge> : r.read_at ? <Badge variant="secondary">Leu {format(new Date(r.read_at), 'dd/MM')}</Badge> : <Badge variant="warning">Pendente</Badge>}
              </li>
            ))}
          </ul>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
