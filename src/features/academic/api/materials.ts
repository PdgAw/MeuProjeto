import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { uploadFile } from '@/lib/storage'

export function useMaterials(subjectId: string | undefined, lessonId?: string) {
  return useQuery({
    queryKey: ['materials', subjectId, lessonId ?? 'all'],
    enabled: Boolean(subjectId),
    queryFn: async () => {
      let q = supabase.from('lesson_materials')
        .select('id, title, kind, url, storage_path, file_name, mime_type, size_bytes, is_published, created_at, lesson_id, lesson:lessons(title, starts_at)')
        .eq('subject_id', subjectId!).order('created_at', { ascending: false })
      if (lessonId) q = q.eq('lesson_id', lessonId)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
}
export type Material = NonNullable<ReturnType<typeof useMaterials>['data']>[number]

export function useAddMaterial(subjectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { title: string; lessonId?: string | null; file?: File | null; url?: string | null }) => {
      const { data: me } = await supabase.auth.getUser()
      const stored = input.file ? await uploadFile('lesson-materials', subjectId, input.file) : null
      const isVideo = input.url && /youtu|vimeo|loom/.test(input.url)
      const { error } = await supabase.from('lesson_materials').insert({
        subject_id: subjectId,
        lesson_id: input.lessonId || null,
        title: input.title,
        kind: stored ? (stored.mime?.includes('presentation') ? 'slides' : 'file') : isVideo ? 'video' : 'link',
        url: stored ? null : input.url,
        storage_path: stored?.path ?? null,
        file_name: stored?.name ?? null,
        mime_type: stored?.mime ?? null,
        size_bytes: stored?.size ?? null,
        created_by: me.user?.id,
      })
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['materials', subjectId] }),
  })
}

export function useDeleteMaterial(subjectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (m: { id: string; storage_path: string | null }) => {
      const { error } = await supabase.from('lesson_materials').delete().eq('id', m.id)
      if (error) throw error
      if (m.storage_path) await supabase.storage.from('lesson-materials').remove([m.storage_path])
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['materials', subjectId] }),
  })
}
