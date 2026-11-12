import type { PitchStatus, RoundStatus } from '../api'

export const PITCH_FLOW: PitchStatus[] = ['draft', 'eligible', 'submitted', 'in_review', 'panel_scheduled', 'evaluated', 'selected', 'not_selected']
export const PITCH_STATUS: Record<PitchStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Rascunho', variant: 'outline' },
  eligible: { label: 'Elegível', variant: 'secondary' },
  submitted: { label: 'Submetido', variant: 'default' },
  in_review: { label: 'Em análise', variant: 'default' },
  panel_scheduled: { label: 'Banca marcada', variant: 'warning' },
  evaluated: { label: 'Avaliado', variant: 'secondary' },
  selected: { label: 'Selecionado', variant: 'success' },
  not_selected: { label: 'Não selecionado', variant: 'destructive' },
}
export const ROUND_STATUS: Record<RoundStatus, string> = { draft: 'Rascunho', open: 'Inscrições abertas', reviewing: 'Em avaliação', closed: 'Encerrada' }
export const PITCH_FIELDS = [
  ['problem', 'Problema'], ['solution', 'Solução'], ['market', 'Mercado'], ['business_model', 'Modelo de negócio'],
  ['traction', 'Tração'], ['strategy', 'Estratégia'], ['team', 'Equipe'], ['capital_use', 'Uso do capital'],
] as const
