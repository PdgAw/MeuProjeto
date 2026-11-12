import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/** Published assignments still open for the Neoleader (no submission yet, or a draft). */
export function usePendingAssignments(userId: string | undefined) {
  return useQuery({
    queryKey: ['assignments', 'pending', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('id, title, due_at, subject:subjects(name), assignment_submissions(status, student_id)')
        .eq('status', 'published')
        .gte('due_at', new Date().toISOString())
        .order('due_at')
        .limit(10)
      if (error) throw error
      return data.filter((a) => {
        const mine = a.assignment_submissions.find((s) => s.student_id === userId)
        return !mine || mine.status === 'draft' || mine.status === 'returned'
      })
    },
  })
}

export function useSelfCheckIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (lessonId: string) => {
      const { data, error } = await supabase.rpc('self_check_in', { p_lesson: lessonId })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lessons', 'today'] })
      void qc.invalidateQueries({ queryKey: ['neo-progress'] })
    },
  })
}
