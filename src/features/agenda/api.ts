import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { endOfDay, startOfDay } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

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

export function useCreateCalendarEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { title: string; description: string | null; type: Database['public']['Enums']['agenda_type']; starts_at: string; ends_at: string | null; location: string | null; meeting_url: string | null; target: { target_type: Database['public']['Enums']['audience_type']; target_id: string | null; role_key: string | null } }) => {
      const { data: me } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('calendar_events').insert({ title: v.title, description: v.description, event_type: v.type, starts_at: v.starts_at, ends_at: v.ends_at, location: v.location, meeting_url: v.meeting_url, created_by: me.user!.id }).select('id').single()
      if (error) throw error
      const t = v.target.target_type === 'user' && !v.target.target_id ? { ...v.target, target_id: me.user!.id } : v.target
      const { error: e2 } = await supabase.from('calendar_event_targets').insert({ event_id: data.id, ...t })
      if (e2) throw e2
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['agenda'] }),
  })
}

/** Export a set of agenda items as one .ics file (Google Calendar / Outlook / Apple). */
export function exportIcs(items: AgendaItem[], name: string) {
  const f = (d: string) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NeoLevel//Agenda//PT']
  for (const i of items) {
    const end = i.ends_at ?? new Date(new Date(i.starts_at).getTime() + 3600e3).toISOString()
    lines.push('BEGIN:VEVENT', `UID:${i.source}-${i.source_id}@neolevel`, `DTSTAMP:${f(new Date().toISOString())}`, `DTSTART:${f(i.starts_at)}`, `DTEND:${f(end)}`,
      `SUMMARY:${esc(i.item_type === 'class' && i.subtitle ? `${i.subtitle}: ${i.title}` : i.title)}`, ...(i.location ? [`LOCATION:${esc(i.location)}`] : []), ...(i.url ? [`URL:${i.url}`] : []), 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }))
  Object.assign(document.createElement('a'), { href: url, download: `${name}.ics` }).click()
  URL.revokeObjectURL(url)
}
