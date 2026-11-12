import { Loader2, MessagesSquare } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, type ButtonProps } from '@/components/ui/button'
import { openDirect } from '@/features/chat/api'

/** Opens (or creates) the direct conversation with a person. */
export function StartChatButton({ userId, label = 'Conversar', ...props }: { userId: string; label?: string } & ButtonProps) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  return (
    <Button {...props} disabled={busy || props.disabled} onClick={async () => {
      setBusy(true)
      try { navigate(`/chat/${await openDirect(userId)}`) } catch (e) { toast.error(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
    }}>
      {busy ? <Loader2 className="animate-spin" /> : <MessagesSquare />}{label}
    </Button>
  )
}
