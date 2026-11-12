import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { storageName } from '@/lib/storage'

export interface Privacy { directory: boolean; city: boolean; bio: boolean; linkedin: boolean; interests: boolean; competencies: boolean; venture: boolean; cohort: boolean }

export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-profile', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [p, d, pr] = await Promise.all([
        supabase.from('profiles').select('id, full_name, preferred_name, avatar_url, job_title, company').eq('id', userId!).single(),
        supabase.from('profile_details').select('*').eq('user_id', userId!).single(),
        supabase.from('profile_private').select('email, phone').eq('user_id', userId!).single(),
      ])
      if (p.error) throw p.error
      if (d.error) throw d.error
      if (pr.error) throw pr.error
      return { profile: p.data, details: { ...d.data, privacy: d.data.privacy as unknown as Privacy }, priv: pr.data }
    },
  })
}

export function useSaveProfile(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: {
      profile: { full_name: string; preferred_name: string | null; job_title: string | null; company: string | null }
      details: { bio: string | null; city: string | null; linkedin_url: string | null; website_url: string | null; interests: string[]; competencies: string[]; sectors: string[]; privacy: Privacy }
      phone: string | null
    }) => {
      const [a, b, c] = await Promise.all([
        supabase.from('profiles').update(v.profile).eq('id', userId),
        supabase.from('profile_details').update({ ...v.details, privacy: v.details.privacy as never }).eq('user_id', userId),
        supabase.from('profile_private').update({ phone: v.phone }).eq('user_id', userId),
      ])
      for (const r of [a, b, c]) if (r.error) throw r.error
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['my-profile'] }); void qc.invalidateQueries({ queryKey: ['auth'] }); void qc.invalidateQueries({ queryKey: ['directory'] }) },
  })
}

/** Avatars are public images under avatars/<user_id>/ (storage RLS: own folder only). */
export function useUploadAvatar(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      if (!file.type.startsWith('image/')) throw new Error('Envie uma imagem (PNG, JPG ou WebP).')
      if (file.size > 5 * 1024 * 1024) throw new Error('Imagem maior que 5 MB.')
      const path = `${userId}/${storageName(file.name)}`
      const { error } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type })
      if (error) throw error
      const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      const { error: e2 } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
      if (e2) throw e2
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['my-profile'] }); void qc.invalidateQueries({ queryKey: ['auth'] }) },
  })
}
