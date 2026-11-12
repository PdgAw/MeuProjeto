import type { Database } from '@/types/database'

type Unit = Database['public']['Enums']['kpi_unit']

export function fmtKpi(v: number | null | undefined, unit: Unit) {
  if (v === null || v === undefined) return '—'
  const n = Number(v)
  if (unit === 'currency') return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  if (unit === 'percent') return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}
export const UNIT_LABEL: Record<Unit, string> = { count: 'Quantidade', currency: 'R$', percent: '%', number: 'Número' }
