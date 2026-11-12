import { Loader2, Paperclip, Send, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { fmtBytes, openStoredFile, type StoredFile } from '@/lib/storage'
import { useSubmitAssignment } from '../api'

interface Existing { content: string | null; link_url: string | null; files: StoredFile[]; status: string }

export function SubmissionForm({ assignmentId, userId, existing, locked }: { assignmentId: string; userId: string; existing: Existing | null; locked: boolean }) {
  const submit = useSubmitAssignment(assignmentId, userId)
  const [content, setContent] = useState('')
  const [link, setLink] = useState('')
  const [keep, setKeep] = useState<StoredFile[]>([])
  const [files, setFiles] = useState<File[]>([])
  useEffect(() => { setContent(existing?.content ?? ''); setLink(existing?.link_url ?? ''); setKeep(existing?.files ?? []) }, [existing])

  const send = (final: boolean) => {
    if (final && !content.trim() && !link.trim() && !keep.length && !files.length) return toast.error('Adicione um texto, link ou arquivo.')
    submit.mutate({ content, link_url: link, newFiles: files, keepFiles: keep, final }, {
      onSuccess: () => { setFiles([]); toast.success(final ? 'Entrega enviada!' : 'Rascunho salvo.') },
      onError: (e) => toast.error(e.message),
    })
  }

  return (
    <div className="space-y-4">
      <FormField id="content" label="Sua resposta"><Textarea id="content" rows={6} value={content} onChange={(e) => setContent(e.target.value)} disabled={locked} /></FormField>
      <FormField id="link" label="Link (opcional)"><Input id="link" type="url" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} disabled={locked} /></FormField>
      <div className="space-y-2">
        <p className="text-sm font-medium">Arquivos</p>
        <ul className="space-y-1.5">
          {keep.map((f) => (
            <li key={f.path} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <button className="flex-1 truncate text-left hover:underline" onClick={() => void openStoredFile('submissions', f.path)}>{f.name}</button>
              <span className="text-xs text-muted-foreground">{fmtBytes(f.size)}</span>
              {!locked && <button onClick={() => setKeep(keep.filter((k) => k.path !== f.path))} aria-label="Remover"><X className="h-4 w-4" /></button>}
            </li>
          ))}
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm">
              <Paperclip className="h-4 w-4 text-primary" /><span className="flex-1 truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground">{fmtBytes(f.size)}</span>
              <button onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Remover"><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        {!locked && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-secondary">
            <Paperclip className="h-4 w-4" /> Anexar arquivo
            <input type="file" multiple className="sr-only" onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])])} />
          </label>
        )}
      </div>
      {!locked && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" disabled={submit.isPending} onClick={() => send(false)}>Salvar rascunho</Button>
          <Button disabled={submit.isPending} onClick={() => send(true)}>{submit.isPending ? <Loader2 className="animate-spin" /> : <Send />} Enviar entrega</Button>
        </div>
      )}
    </div>
  )
}
