import type { Database } from '@/types/database'

type Enums = Database['public']['Enums']

export const VENTURE_STAGES: { key: Enums['venture_stage']; label: string }[] = [
  { key: 'ideation', label: 'Ideação' },
  { key: 'validation', label: 'Validação' },
  { key: 'mvp', label: 'MVP' },
  { key: 'operation', label: 'Operação' },
  { key: 'traction', label: 'Tração' },
  { key: 'scale', label: 'Escala' },
]
export const stageLabel = (s: Enums['venture_stage']) => VENTURE_STAGES.find((x) => x.key === s)?.label ?? s

export const TRACK_LABEL: Record<Enums['neoleader_track'], string> = {
  founder: 'First-time Founder',
  successor: 'Herdeiro / Sucessor',
  other: 'Perfil especial',
}

export const JOURNEY_KIND_LABEL: Record<Enums['journey_item_kind'], string> = {
  subject: 'Disciplina',
  mentoring: 'Mentoria',
  project: 'Projeto',
  event: 'Evento',
  company_visit: 'Visita empresarial',
  milestone: 'Milestone',
  panel: 'Banca',
  experience: 'Experiência',
  certification: 'Certificação',
}

export type JourneyStatus = 'completed' | 'in_progress' | 'upcoming' | 'blocked'
export const JOURNEY_STATUS_LABEL: Record<JourneyStatus, string> = {
  completed: 'Concluído',
  in_progress: 'Em andamento',
  upcoming: 'Próximo',
  blocked: 'Bloqueado',
}

export const AGENDA_TYPE_LABEL: Record<Enums['agenda_type'], string> = {
  class: 'Aula',
  mentoring: 'Mentoria',
  event: 'Evento',
  visit: 'Visita',
  deadline: 'Entrega',
  panel: 'Banca',
  meeting: 'Reunião',
}

export const LESSON_TYPE_LABEL: Record<Enums['lesson_type'], string> = {
  class: 'Aula',
  workshop: 'Workshop',
  masterclass: 'Masterclass',
  case: 'Case',
  lab: 'Laboratório',
  dynamic: 'Dinâmica',
  practical: 'Aula prática',
}

export const CHECKPOINT_STATUS_LABEL: Record<Enums['checkpoint_status'], string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  done: 'Concluído',
}

export const EXPERIENCE_CATEGORY_LABEL: Record<Enums['experience_category'], string> = {
  neomeeting: 'Neomeeting',
  conexao_neo: 'Conexão Neo',
  company_visit: 'Visita empresarial',
  workshop: 'Workshop',
  mission: 'Missão',
  event: 'Evento',
  meetup: 'Encontro',
  international: 'Experiência internacional',
  other: 'Experiência',
}

/** Human subtitle for an agenda row (experience categories come as enum keys). */
export function agendaSubtitle(i: { source: string; subtitle: string | null }) {
  if (i.source === 'experience' && i.subtitle && i.subtitle in EXPERIENCE_CATEGORY_LABEL) {
    return EXPERIENCE_CATEGORY_LABEL[i.subtitle as Enums['experience_category']]
  }
  return i.subtitle
}
