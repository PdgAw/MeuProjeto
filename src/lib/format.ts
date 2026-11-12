import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const asDate = (d: string | Date) => (typeof d === 'string' ? new Date(d) : d)

export const fmtTime = (d: string | Date) => format(asDate(d), 'HH:mm')
export const fmtDate = (d: string | Date) => format(asDate(d), "dd 'de' MMM", { locale: ptBR })
export const fmtDateLong = (d: string | Date) => format(asDate(d), "EEEE, dd 'de' MMMM", { locale: ptBR })
export const fmtWeekday = (d: string | Date) => format(asDate(d), 'EEE', { locale: ptBR })
export const fmtDayMonth = (d: string | Date) => format(asDate(d), 'dd/MM')

/** "Hoje, 19:00" · "Amanhã, 15:00" · "sex, 14/11 · 19:00" */
export function fmtWhen(d: string | Date) {
  const date = asDate(d)
  if (isToday(date)) return `Hoje, ${fmtTime(date)}`
  if (isTomorrow(date)) return `Amanhã, ${fmtTime(date)}`
  if (isYesterday(date)) return `Ontem, ${fmtTime(date)}`
  return `${format(date, 'EEE, dd/MM', { locale: ptBR })} · ${fmtTime(date)}`
}

export const fmtRelative = (d: string | Date) => formatDistanceToNowStrict(asDate(d), { locale: ptBR, addSuffix: true })

/** A "date" column (YYYY-MM-DD) parsed as a local date, not UTC midnight. */
export const parseLocalDate = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day)
}

export const fmtCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
