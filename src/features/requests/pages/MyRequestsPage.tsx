import { Inbox, Paperclip, Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { fmtRelative } from '@/lib/format'
import { REQUEST_STATUS_LABEL, REQUEST_TYPE_LABEL, useCreateRequest, useRequests, type RequestType } from '../api'
import { RequestThread } from '../components/RequestThread'

/** Neoleader (or anyone): open requests to the secretariat and follow the answers. */
export default function MyRequestsPage() {
  const { user } = useAuth()
  const { data, isPending } = useRequests('mine', user?.user_id)
  const [params, setParams] = useSearchParams()
  const sel = params.get('id')
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold sm:text-3xl">Solicitações</h1><p className="mt-1 text-muted-foreground">Peça documentos, declarações, alterações cadastrais ou suporte à secretaria.</p></div>
        <NewRequestDialog onCreated={(id) => setParams({ id })} />
      </header>
      {isPending ? <CardSkeleton lines={4} /> : !data?.length ? <EmptyState icon={<Inbox className="h-8 w-8" />} text="Você ainda não abriu nenhuma solicitação." /> : (
        <ul className="divide-y rounded-lg border bg-card">{data.map((r) => (
          <li key={r.id}><button onClick={() => setParams({ id: r.id })} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/40">
            <span className="min-w-0"><span className="block truncate font-medium">{r.subject}</span><span className="text-xs text-muted-foreground">{REQUEST_TYPE_LABEL[r.type]} · atualizada {fmtRelative(r.updated_at)}</span></span>
            <Badge variant={r.status === 'resolved' ? 'success' : r.status === 'awaiting_user' ? 'warning' : r.status === 'canceled' ? 'outline' : 'default'}>{REQUEST_STATUS_LABEL[r.status]}</Badge>
          </button></li>
        ))}</ul>
      )}
      <Sheet open={Boolean(sel)} onOpenChange={(o) => !o && setParams({}, { replace: true })}>
        <SheetContent side="right" title="Solicitação" className="w-full overflow-y-auto p-5 pt-12 sm:w-[32rem]">{sel && <RequestThread id={sel} staff={false} />}</SheetContent>
      </Sheet>
    </div>
  )
}

function NewRequestDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const { user } = useAuth()
  const create = useCreateRequest()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<RequestType>('declaration')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setType('declaration'); setSubject(''); setDescription(''); setFiles([]) } }}>
      <Button onClick={() => setOpen(true)}><Plus />Nova solicitação</Button>
      <DialogContent title="Nova solicitação">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault(); if (!user || subject.trim().length < 3) return toast.error('Descreva o assunto.')
          create.mutate({ requester_id: user.user_id, type, subject: subject.trim(), description: description.trim(), files }, { onSuccess: (id) => { toast.success('Solicitação enviada.'); setOpen(false); onCreated(id) }, onError: (er) => toast.error(er.message) })
        }}>
          <FormField id="rq-type" label="Tipo"><Select id="rq-type" value={type} onChange={(e) => setType(e.target.value as RequestType)}>{Object.entries(REQUEST_TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></FormField>
          <FormField id="rq-subject" label="Assunto"><Input id="rq-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex.: Declaração de matrícula para o trabalho" /></FormField>
          <FormField id="rq-desc" label="Detalhes"><Textarea id="rq-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
          <div><input ref={fileRef} type="file" multiple hidden onChange={(e) => { setFiles([...files, ...Array.from(e.target.files ?? [])]); e.target.value = '' }} />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Paperclip />Anexar arquivos</Button>
            {files.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{files.map((f) => f.name).join(', ')}</p>}</div>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending}>Enviar</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
