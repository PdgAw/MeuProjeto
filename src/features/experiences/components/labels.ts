import type { ExperienceCategory, RegistrationStatus } from '../api'
export const CATEGORY: Record<ExperienceCategory, string> = {
  neomeeting: 'Neomeeting', conexao_neo: 'Conexão Neo', company_visit: 'Visita Empresarial', workshop: 'Workshop', mission: 'Missão',
  event: 'Evento', meetup: 'Encontro', international: 'Experiência Internacional', other: 'Outro',
}
export const REG_STATUS: Record<RegistrationStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'secondary' | 'destructive' }> = {
  confirmed: { label: 'Presença confirmada', variant: 'default' }, waitlist: { label: 'Lista de espera', variant: 'warning' },
  canceled: { label: 'Cancelada', variant: 'secondary' }, attended: { label: 'Participou', variant: 'success' }, no_show: { label: 'Não compareceu', variant: 'destructive' },
}
