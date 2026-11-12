import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { useMentorMentees } from '../api'
import { MenteeCard } from '../components/MenteeCard'

export default function MenteesPage() {
  const { data, isPending } = useMentorMentees()
  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold sm:text-3xl">Meus Neoleaders</h1><p className="mt-1 text-muted-foreground">Negócio, mentorias, metas e sinais de atenção de cada mentorado.</p></header>
      {isPending ? <CardSkeleton lines={3} /> : !data?.length ? <EmptyState text="Nenhum Neoleader vinculado a você." /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.map((m) => <MenteeCard key={m.student_id} m={m} />)}</div>
      )}
    </div>
  )
}
