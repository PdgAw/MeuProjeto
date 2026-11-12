import { Lock } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CardSkeleton } from '@/components/shared/SectionCard'
import { fmtRelative } from '@/lib/format'
import { useAddPrivateNote, usePrivateNotes } from '../api'

/** Only rendered for the Neomentor/management; RLS also hides these rows from the Neoleader. */
export function PrivateNotesPanel({ studentId, sessionId }: { studentId: string; sessionId?: string }) {
  const { data, isPending } = usePrivateNotes(studentId, true)
  const add = useAddPrivateNote(studentId)
  const [text, setText] = useState('')
  const notes = (data ?? []).filter((n) => !sessionId || n.session_id === sessionId)
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />Visível só para você e a coordenação. Nunca para o Neoleader.</p>
      {isPending ? <CardSkeleton lines={1} /> : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-md bg-warning/10 p-3 text-sm">
              <p className="whitespace-pre-line">{n.content}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{n.author?.full_name} · {fmtRelative(n.created_at)}</p>
            </li>
          ))}
          {!notes.length && <li className="text-sm text-muted-foreground">Nenhuma nota privada.</li>}
        </ul>
      )}
      <form className="space-y-2" onSubmit={(e) => {
        e.preventDefault()
        if (!text.trim()) return
        add.mutate({ content: text.trim(), sessionId }, { onSuccess: () => { setText(''); toast.success('Nota privada salva.') }, onError: (er) => toast.error(er.message) })
      }}>
        <Textarea rows={2} placeholder="Nova nota privada" value={text} onChange={(e) => setText(e.target.value)} aria-label="Nova nota privada" />
        <Button type="submit" size="sm" variant="outline" disabled={add.isPending}>Salvar nota</Button>
      </form>
    </div>
  )
}
