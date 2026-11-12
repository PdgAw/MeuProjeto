import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useAchievements(studentId?: string) {
  return useQuery({
    queryKey: ['achievements', studentId ?? 'me'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('student_achievements', studentId ? { p_student: studentId } : {})
      if (error) throw error
      return data
    },
  })
}
