import type { AnnouncementType } from '../api'
export const TYPE: Record<AnnouncementType, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'warning' | 'success' | 'outline' }> = {
  academic: { label: 'Acadêmico', variant: 'default' }, urgent: { label: 'Urgente', variant: 'destructive' }, event: { label: 'Evento', variant: 'warning' },
  mentoring: { label: 'Mentoria', variant: 'secondary' }, institutional: { label: 'Institucional', variant: 'outline' }, administrative: { label: 'Administrativo', variant: 'secondary' },
}
