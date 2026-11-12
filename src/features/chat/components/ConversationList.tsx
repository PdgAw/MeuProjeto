import { BellOff, Search, SquarePen, Users } from 'lucide-react'
import { format, isToday } from 'date-fns'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { cn, initials } from '@/lib/utils'
import type { ConversationItem } from '../api'

interface Props { items: ConversationItem[] | undefined; loading: boolean; onNew: () => void; onNewGroup?: () => void; onSearch: () => void }

export function ConversationList({ items, loading, onNew, onNewGroup, onSearch }: Props) {
  const [filter, setFilter] = useState('')
  const list = (items ?? []).filter((c) => !filter || c.title.toLowerCase().includes(filter.toLowerCase()))
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <h1 className="text-lg font-semibold">Chat</h1>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={onSearch} aria-label="Buscar mensagens"><Search /></Button>
          {onNewGroup && <Button size="icon" variant="ghost" onClick={onNewGroup} aria-label="Novo grupo"><Users /></Button>}
          <Button size="icon" variant="ghost" onClick={onNew} aria-label="Nova conversa"><SquarePen /></Button>
        </div>
      </div>
      <div className="p-3"><Input placeholder="Filtrar conversas" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrar conversas" /></div>
      <nav className="flex-1 overflow-y-auto" aria-label="Conversas">
        {loading ? <div className="p-3"><CardSkeleton /></div> : !list.length ? <EmptyState text="Nenhuma conversa ainda." /> : list.map((c) => (
          <NavLink key={c.id} to={`/chat/${c.id}`} className={({ isActive }) => cn('flex items-center gap-3 px-3 py-3 hover:bg-secondary/60', isActive && 'bg-secondary')}>
            <Avatar className="h-11 w-11">{c.avatar_url && <AvatarImage src={c.avatar_url} alt="" />}<AvatarFallback>{c.type === 'direct' ? initials(c.title) : <Users className="h-4 w-4" />}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className={cn('truncate', c.unread > 0 ? 'font-semibold' : 'font-medium')}>{c.title}</p>
                {c.last_message_at && <span className="shrink-0 text-[11px] text-muted-foreground">{isToday(new Date(c.last_message_at)) ? format(new Date(c.last_message_at), 'HH:mm') : format(new Date(c.last_message_at), 'dd/MM')}</span>}
              </div>
              <div className="flex items-center gap-2">
                <p className={cn('flex-1 truncate text-sm', c.unread > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                  {c.type !== 'direct' && c.last_sender_name ? `${c.last_sender_name.split(' ')[0]}: ` : ''}{c.last_message ?? 'Sem mensagens'}
                </p>
                {c.is_muted && <BellOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Silenciada" />}
                {c.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">{c.unread}</span>}
              </div>
            </div>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
