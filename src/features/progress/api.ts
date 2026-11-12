import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useNeoProgress(studentId?: string) {
  return useQuery({
    queryKey: ['neo-progress', studentId ?? 'me'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('neo_progress', studentId ? { p_student: studentId } : {})
      if (error) throw error
      return data
    },
  })
}
export type ProgressDimension = NonNullable<ReturnType<typeof useNeoProgress>['data']>[number]

/** Weighted average of the dimensions that already have data. */
export function overallProgress(dims: ProgressDimension[] | undefined) {
  const scored = (dims ?? []).filter((d) => d.score !== null)
  const weight = scored.reduce((s, d) => s + Number(d.weight), 0)
  if (!weight) return null
  return Math.round(scored.reduce((s, d) => s + Number(d.score) * Number(d.weight), 0) / weight)
}
