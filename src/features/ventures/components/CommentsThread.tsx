import { MessageSquare, Send } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { fmtRelative } from '@/lib/format'
import { initials } from '@/lib/utils'
import { useAddComment, type VentureComment } from '../api'

/** Neomentores, coordination and the Neoleader discuss the plan here. */
export function CommentsThread({ ventureId, comments, objectiveId, compact }: { ventureId: string; comments: VentureComment[]; objectiveId?: string | null; compact?: boolean }) {
  const add = useAddComment(ventureId)
  const [body, setBody] = useState('')
  const [open, setOpen] = useState(!compact)
  const list = comments.filter((c) => (objectiveId === undefined ? !c.objective_id && !c.action_id : c.objective_id === objectiveId)).sort((a, b) => a.created_at.localeCompare(b.created_at))
  if (compact && !open) {
    return <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => setOpen(true)}><MessageSquare className="h-3.5 w-3.5" />{list.length ? `${list.length} comentário${list.length > 1 ? 's' : ''}` : 'Comentar'}</button>
  }
  return (
    <div className="space-y-3">
      {list.map((c) => (
        <div key={c.id} className="flex gap-3">
          <Avatar className="h-7 w-7">{c.author?.avatar_url && <AvatarImage src={c.author.avatar_url} alt="" />}<AvatarFallback className="text-[10px]">{initials(c.author?.full_name)}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1 rounded-lg bg-secondary/60 px-3 py-2 text-sm">
            <p className="text-xs"><span className="font-semibold">{c.author?.full_name}</span> <span className="text-muted-foreground">· {fmtRelative(c.created_at)}</span></p>
            <p className="mt-0.5 whitespace-pre-line">{c.body}</p>
          </div>
        </div>
      ))}
      <form className="flex items-end gap-2" onSubmit={(e) => {
        e.preventDefault()
        if (!body.trim()) return
        add.mutate({ body: body.trim(), objectiveId: objectiveId ?? null }, { onSuccess: () => setBody(''), onError: (er) => toast.error(er.message) })
      }}>
        <Textarea rows={1} className="min-h-10" placeholder="Escreva um comentário" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Comentário" />
        <Button type="submit" size="icon" disabled={add.isPending || !body.trim()} aria-label="Enviar comentário"><Send /></Button>
      </form>
    </div>
  )
}
