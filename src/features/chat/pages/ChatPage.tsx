import { MessagesSquare } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useConversations } from '../api'
import { NewChatDialog, NewGroupDialog, SearchDialog } from '../components/ChatDialogs'
import { ConversationList } from '../components/ConversationList'
import { Thread } from '../components/Thread'

/** Chat em tempo real: list + thread side by side on desktop, one at a time on mobile. */
export default function ChatPage() {
  const { id } = useParams()
  const { user, hasPermission } = useAuth()
  const convs = useConversations(user?.user_id)
  const [dialog, setDialog] = useState<'new' | 'group' | 'search' | null>(null)
  if (!user) return null
  const current = convs.data?.find((c) => c.id === id)
  const canGroup = hasPermission('chat.manage') || hasPermission('communications.create')
  return (
    <Card className="-mx-4 flex h-[calc(100dvh-10.5rem)] overflow-hidden rounded-none border-x-0 sm:mx-0 sm:rounded-lg sm:border-x lg:h-[calc(100dvh-7.5rem)]">
      <aside className={cn('w-full border-r lg:w-80 lg:shrink-0', id && 'hidden lg:block')}>
        <ConversationList items={convs.data} loading={convs.isPending} onNew={() => setDialog('new')} onNewGroup={canGroup ? () => setDialog('group') : undefined} onSearch={() => setDialog('search')} />
      </aside>
      <section className={cn('min-w-0 flex-1', !id && 'hidden lg:flex')}>
        {current ? <Thread key={current.id} conversation={current} me={{ id: user.user_id, name: user.preferred_name || user.full_name }} /> : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <MessagesSquare className="h-10 w-10" />
            <p>{id && !convs.isPending ? 'Conversa não encontrada.' : 'Escolha uma conversa ou comece uma nova.'}</p>
          </div>
        )}
      </section>
      {dialog === 'new' && <NewChatDialog userId={user.user_id} onClose={() => setDialog(null)} />}
      {dialog === 'group' && <NewGroupDialog userId={user.user_id} onClose={() => setDialog(null)} />}
      {dialog === 'search' && <SearchDialog onClose={() => setDialog(null)} />}
    </Card>
  )
}
