import type { Database } from '@/types/database'
type Enums = Database['public']['Enums']

export const SESSION_STATUS: Record<Enums['mentoring_status'], { label: string; variant: 'default' | 'success' | 'warning' | 'secondary' | 'destructive' }> = {
  requested: { label: 'Solicitada', variant: 'warning' },
  scheduled: { label: 'Agendada', variant: 'default' },
  completed: { label: 'Realizada', variant: 'success' },
  canceled: { label: 'Cancelada', variant: 'secondary' },
  no_show: { label: 'Não compareceu', variant: 'destructive' },
}
export const GOAL_STATUS: Record<Enums['goal_status'], string> = {
  not_started: 'Não iniciada', in_progress: 'Em andamento', blocked: 'Bloqueada', done: 'Concluída', canceled: 'Cancelada',
}
export const GOAL_SOURCE: Record<Enums['goal_source'], string> = {
  self: 'Pessoal', mentoring: 'Mentoria', coordination: 'Coordenação', venture: 'Negócio',
}
export const MENTEE_FLAG: Record<string, string> = {
  pending_request: 'Solicitação pendente', no_recent_session: 'Sem mentoria há 30 dias', nothing_scheduled: 'Nada agendado',
  overdue_steps: 'Passos atrasados', stale_venture: 'Projeto parado',
}
