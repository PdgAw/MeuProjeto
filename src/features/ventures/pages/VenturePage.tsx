import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { CardSkeleton } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useVenture } from '../api'
import { VentureWorkspace } from '../components/VentureWorkspace'

/** A venture seen by its Neomentores or by management (comments for mentors; edits need ventures.manage). */
export default function VenturePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, hasPermission } = useAuth()
  const { data, isPending } = useVenture(id)
  if (!user) return null
  if (isPending) return <CardSkeleton lines={5} />
  if (!data) return <p className="text-muted-foreground">Negócio não encontrado ou sem acesso.</p>
  const isOwner = data.owner_id === user.user_id
  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar</button>
      <VentureWorkspace venture={data} editable={isOwner || hasPermission('ventures.manage')} isOwner={isOwner} track={null} />
    </div>
  )
}
