import { supabase } from './supabase'

export type Bucket = 'avatars' | 'covers' | 'documents' | 'lesson-materials' | 'submissions' | 'chat' | 'ventures' | 'experiences' | 'requests'

export interface StoredFile { path: string; name: string; mime: string | null; size: number }

const MAX_MB: Partial<Record<Bucket, number>> = { 'lesson-materials': 200, submissions: 50, documents: 50 }

/** Keeps the original name readable but storage-safe and unique. */
export function storageName(fileName: string) {
  const clean = fileName.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').slice(-80)
  return `${crypto.randomUUID().slice(0, 8)}-${clean}`
}

/** Uploads under `folder/` — the first folder segment is what storage RLS checks. */
export async function uploadFile(bucket: Bucket, folder: string, file: File): Promise<StoredFile> {
  const limit = MAX_MB[bucket]
  if (limit && file.size > limit * 1024 * 1024) throw new Error(`Arquivo maior que ${limit} MB.`)
  const path = `${folder}/${storageName(file.name)}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || undefined })
  if (error) throw new Error(error.message.includes('row-level security') ? 'Sem permissão para enviar este arquivo.' : error.message)
  return { path, name: file.name, mime: file.type || null, size: file.size }
}

/** Short-lived link for private buckets (default 10 minutes). */
export async function signedUrl(bucket: Bucket, path: string, seconds = 600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, seconds)
  if (error) throw new Error('Arquivo indisponível ou sem permissão.')
  return data.signedUrl
}

export async function openStoredFile(bucket: Bucket, path: string) {
  window.open(await signedUrl(bucket, path), '_blank', 'noopener')
}

export function fmtBytes(n: number | null | undefined) {
  if (!n) return ''
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
