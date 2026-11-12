import { useQuery } from '@tanstack/react-query'
import { endOfDay, startOfDay } from 'date-fns'
import { supabase } from '@/lib/supabase'

export function useAgenda(from: Date, to: Date) {
  return useQuery({
    queryKey: ['agenda', from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_agenda', { p_from: from.toISOString(), p_to: to.toISOString() })
      if (error) throw error
      return data
    },
  })
}
export type AgendaItem = NonNullable<ReturnType<typeof useAgenda>['data']>[number]

/** Today's lessons with teacher, room and the caller's own check-in state. */
export function useTodayLessons(userId: string | undefined) {
  const day = new Date()
  return useQuery({
    queryKey: ['lessons', 'today', userId, startOfDay(day).toISOString()],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, starts_at, ends_at, room, location, modality, meeting_url, online_provider, status, checkin_open, lesson_type, guest_name, subject:subjects(name), teacher:profiles!lessons_teacher_id_fkey(full_name), attendance(status, student_id)')
        .gte('starts_at', startOfDay(day).toISOString())
        .lte('starts_at', endOfDay(day).toISOString())
        .neq('status', 'canceled')
        .order('starts_at')
      if (error) throw error
      return data.map((l) => ({ ...l, myAttendance: l.attendance.find((a) => a.student_id === userId)?.status ?? null }))
    },
  })
}
export type TodayLesson = NonNullable<ReturnType<typeof useTodayLessons>['data']>[number]
