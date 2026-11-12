import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** First name for greetings ("Boa noite, Lucas."). */
export function firstName(fullName?: string | null) {
  return fullName?.trim().split(/\s+/)[0] ?? ''
}

export function initials(fullName?: string | null) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/** Greeting based on the local hour. */
export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}
