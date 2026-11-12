import type { Database } from '@/types/database'

export const ATTENDANCE_LABEL: Record<Database['public']['Enums']['attendance_status'], string> = {
  present: 'Presente', late: 'Atrasado', absent: 'Falta', excused: 'Justificada',
}
export const MODALITY_LABEL: Record<Database['public']['Enums']['lesson_modality'], string> = {
  in_person: 'Presencial', online: 'Online', hybrid: 'Híbrida',
}
export const SUBMISSION_LABEL: Record<Database['public']['Enums']['submission_status'], string> = {
  draft: 'Rascunho', submitted: 'Entregue', late: 'Entregue com atraso', reviewed: 'Avaliada', returned: 'Devolvida para ajuste',
}
export const DIMENSION_LABEL: Record<Database['public']['Enums']['progress_dimension'], string> = {
  learning: 'Aprendizado', execution: 'Execução', mentoring: 'Mentorias', participation: 'Participação',
  venture: 'Projeto empresarial', experiences: 'Experiências', goals: 'Metas',
}
