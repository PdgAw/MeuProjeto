import { AlertTriangle, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CardSkeleton, EmptyState, SectionCard } from '@/components/shared/SectionCard'
import { cn } from '@/lib/utils'
import { RISK_ALERTS, type Overview, type StudentInsight } from '../api'

interface Alert { key: string; text: string; people: { id: string; name: string; to: string }[] }

/** "3 alunos com frequência baixa" — expand to see who, click to open the Perfil 360º. */
export function AlertsCard({ students, overview, loading }: { students: StudentInsight[]; overview?: Overview; loading: boolean }) {
  const [open, setOpen] = useState<string | null>(null)
  const alerts: Alert[] = [
    ...Object.entries(RISK_ALERTS).map(([k, l]) => {
      const list = students.filter((s) => s.risk_flags.includes(k))
      return { key: k, text: `${list.length} ${list.length === 1 ? l.one : l.many}`, people: list.map((s) => ({ id: s.user_id, name: s.full_name, to: `/gestao/neoleaders/${s.user_id}` })) }
    }),
    { key: 'mentorings_overdue', text: `${overview?.mentorings_overdue.length ?? 0} mentorias atrasadas (agendadas e não concluídas)`,
      people: (overview?.mentorings_overdue ?? []).map((m) => ({ id: m.session_id, name: m.full_name, to: `/mentorias/${m.session_id}` })) },
    { key: 'documents_pending', text: `${overview?.documents_pending.length ?? 0} alunos com documentos pendentes`,
      people: (overview?.documents_pending ?? []).map((d) => ({ id: d.user_id, name: d.full_name, to: `/gestao/neoleaders/${d.user_id}` })) },
  ].filter((a) => a.people.length > 0)

  return (
    <SectionCard title="Alertas" icon={<AlertTriangle className="h-4 w-4 text-warning" />}>
      {loading ? <CardSkeleton lines={3} /> : !alerts.length ? <EmptyState text="Nenhum alerta. Tudo em dia." /> : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.key} className="rounded-md border">
              <button className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium" onClick={() => setOpen(open === a.key ? null : a.key)} aria-expanded={open === a.key}>
                <span className="flex-1">{a.text}</span><ChevronDown className={cn('h-4 w-4 transition-transform', open === a.key && 'rotate-180')} />
              </button>
              {open === a.key && (
                <ul className="flex flex-wrap gap-1.5 border-t px-3 py-2.5">
                  {a.people.map((p) => <li key={p.id}><Link to={p.to} className="inline-block rounded-full bg-secondary px-2.5 py-1 text-xs font-medium hover:bg-primary hover:text-primary-foreground">{p.name}</Link></li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
