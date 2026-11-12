import { Megaphone } from 'lucide-react'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { fmtRelative } from '@/lib/format'
import { useSubjectAnnouncements } from '../../api'

export function AnnouncementsTab({ subjectId }: { subjectId: string }) {
  const { data, isPending } = useSubjectAnnouncements(subjectId)
  if (isPending) return <CardSkeleton />
  if (!data?.length) return <EmptyState icon={<Megaphone className="h-5 w-5" />} text="Nenhum comunicado desta disciplina." />
  return (
    <ul className="space-y-3">
      {data.map((a) => (
        <li key={a.id} className="rounded-lg border bg-card p-4">
          <p className="font-semibold">{a.title}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{a.body}</p>
          <p className="mt-2 text-xs text-muted-foreground">{a.author?.full_name} · {fmtRelative(a.publish_at)}</p>
        </li>
      ))}
    </ul>
  )
}
