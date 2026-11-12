import { Search } from 'lucide-react'
import { format } from 'date-fns'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useCohorts } from '@/features/academic/api'
import { cn, initials } from '@/lib/utils'
import { openDirect, useContacts, useCreateGroup, useMessageSearch } from '../api'

export function NewChatDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const contacts = useContacts(userId)
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const list = (contacts.data ?? []).filter((c) => !q || `${c.full_name} ${c.job_title ?? ''}`.toLowerCase().includes(q.toLowerCase())).slice(0, 50)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Nova conversa">
        <Input placeholder="Buscar pessoa" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Buscar pessoa" />
        <ul className="mt-3 max-h-80 divide-y overflow-y-auto rounded-md border">
          {list.map((c) => (
            <li key={c.id}>
              <button className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/60" onClick={async () => {
                try { const id = await openDirect(c.id); onClose(); navigate(`/chat/${id}`) } catch (e) { toast.error(e instanceof Error ? e.message : String(e)) }
              }}>
                <Avatar className="h-8 w-8">{c.avatar_url && <AvatarImage src={c.avatar_url} alt="" />}<AvatarFallback className="text-xs">{initials(c.full_name)}</AvatarFallback></Avatar>
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{c.full_name}</span>{c.job_title && <span className="block truncate text-xs text-muted-foreground">{c.job_title}</span>}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

export function NewGroupDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const contacts = useContacts(userId)
  const cohorts = useCohorts()
  const create = useCreateGroup()
  const navigate = useNavigate()
  const [v, setV] = useState({ title: '', type: 'group' as 'group' | 'cohort' | 'team', cohortId: '' })
  const [members, setMembers] = useState<string[]>([])
  const [q, setQ] = useState('')
  const list = (contacts.data ?? []).filter((c) => !q || c.full_name.toLowerCase().includes(q.toLowerCase()))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Novo grupo">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault()
          create.mutate({ title: v.title, type: v.type, members, cohortId: v.type === 'cohort' ? v.cohortId || null : null },
            { onSuccess: (id) => { toast.success('Grupo criado.'); onClose(); navigate(`/chat/${id}`) }, onError: (er) => toast.error(er.message) })
        }}>
          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <FormField id="g-title" label="Nome"><Input id="g-title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></FormField>
            <FormField id="g-type" label="Tipo"><Select id="g-type" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value as typeof v.type })}><option value="group">Grupo</option><option value="cohort">Turma</option><option value="team">Equipe interna</option></Select></FormField>
          </div>
          {v.type === 'cohort' && (
            <FormField id="g-cohort" label="Turma" hint="Todos os Neoleaders ativos da turma entram automaticamente.">
              <Select id="g-cohort" value={v.cohortId} onChange={(e) => setV({ ...v, cohortId: e.target.value })}><option value="">Selecione…</option>{cohorts.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            </FormField>
          )}
          <FormField id="g-members" label={`Participantes (${members.length})`}>
            <Input placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar participantes" />
            <div className="mt-2 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
              {list.map((c) => <button type="button" key={c.id} onClick={() => setMembers(members.includes(c.id) ? members.filter((x) => x !== c.id) : [...members, c.id])}
                className={cn('rounded-full border px-2.5 py-1 text-xs', members.includes(c.id) ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary')}>{c.full_name}</button>)}
            </div>
          </FormField>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={create.isPending}>Criar grupo</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const res = useMessageSearch(q)
  const navigate = useNavigate()
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Buscar mensagens">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Digite ao menos 3 letras" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Buscar mensagens" /></div>
        <ul className="mt-3 max-h-96 space-y-1 overflow-y-auto">
          {res.data?.map((m) => (
            <li key={m.id}><button className="w-full rounded-md p-2.5 text-left hover:bg-secondary/60" onClick={() => { onClose(); navigate(`/chat/${m.conversation_id}`) }}>
              <p className="text-xs text-muted-foreground">{m.sender?.full_name} · {format(new Date(m.created_at), 'dd/MM HH:mm')}</p>
              <p className="line-clamp-2 text-sm">{m.body}</p>
            </button></li>
          ))}
          {q.length >= 3 && res.data && !res.data.length && <li className="py-6 text-center text-sm text-muted-foreground">Nada encontrado.</li>}
        </ul>
        <DialogFooter><Button variant="outline" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
