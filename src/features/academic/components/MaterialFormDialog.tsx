import { Loader2, Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { fmtBytes } from '@/lib/storage'
import { useAddMaterial } from '../api'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  subjectId: string
  lessons: { id: string; title: string }[]
  defaultLessonId?: string
}

export function MaterialFormDialog({ open, onOpenChange, subjectId, lessons, defaultLessonId }: Props) {
  const add = useAddMaterial(subjectId)
  const [mode, setMode] = useState<'file' | 'link'>('file')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [lessonId, setLessonId] = useState(defaultLessonId ?? '')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return toast.error('Informe um título.')
    if (mode === 'file' && !file) return toast.error('Escolha um arquivo.')
    if (mode === 'link' && !/^https?:\/\//.test(url)) return toast.error('Informe um link válido.')
    try {
      await add.mutateAsync({ title: title.trim(), lessonId: lessonId || null, file: mode === 'file' ? file : null, url: mode === 'link' ? url : null })
      toast.success('Material publicado.')
      setTitle(''); setUrl(''); setFile(null)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Publicar material" description="Arquivos ficam em armazenamento privado: só a turma e os professores acessam.">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            {(['file', 'link'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`rounded-md py-1.5 text-sm font-medium ${mode === m ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
                {m === 'file' ? 'Arquivo' : 'Link / vídeo'}
              </button>
            ))}
          </div>
          <FormField id="m-title" label="Título"><Input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)} /></FormField>
          {mode === 'file' ? (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm hover:bg-secondary/50">
              <Upload className="h-5 w-5 text-muted-foreground" />
              {file ? <span className="font-medium">{file.name} · {fmtBytes(file.size)}</span> : <span className="text-muted-foreground">Clique para escolher (até 200 MB)</span>}
              <input type="file" className="sr-only" onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setFile(f)
                if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''))
              }} />
            </label>
          ) : (
            <FormField id="m-url" label="Link"><Input id="m-url" type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} /></FormField>
          )}
          <FormField id="m-lesson" label="Aula (opcional)">
            <Select id="m-lesson" value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
              <option value="">Material geral da disciplina</option>
              {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </Select>
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={add.isPending}>{add.isPending && <Loader2 className="animate-spin" />}Publicar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
