import type { Database } from '@/types/database'

export type DashboardKey = 'neoleader' | 'coordination' | 'direction' | 'teacher' | 'mentor' | 'secretary' | 'staff'
export type UserStatus = Database['public']['Enums']['user_status']
export type NeoleaderTrack = Database['public']['Enums']['neoleader_track']

/** Permission keys defined in public.permissions (migration 1100). */
export type PermissionKey =
  | 'users.view' | 'users.create' | 'users.edit' | 'users.delete'
  | 'students.view' | 'students.edit'
  | 'classes.view' | 'classes.create' | 'classes.edit'
  | 'subjects.manage' | 'lessons.manage' | 'attendance.manage'
  | 'mentoring.view' | 'mentoring.manage'
  | 'ventures.view' | 'ventures.manage'
  | 'panels.manage' | 'panels.evaluate' | 'panels.results'
  | 'events.manage' | 'communications.create'
  | 'documents.view' | 'documents.upload' | 'documents.manage'
  | 'chat.manage'
  | 'admissions.view' | 'admissions.manage' | 'admissions.committee'
  | 'finance.view' | 'finance.manage'
  | 'requests.manage' | 'reports.view' | 'settings.manage' | 'permissions.manage'
  | 'community.view'

/** Shape returned by the current_user_context() RPC. */
export interface UserContext {
  user_id: string
  full_name: string
  preferred_name: string | null
  avatar_url: string | null
  job_title: string | null
  status: UserStatus
  must_change_password: boolean
  roles: { key: string; name: string }[]
  primary_role: string | null
  dashboard: DashboardKey
  permissions: PermissionKey[]
  cohort: { id: string; name: string } | null
  track: NeoleaderTrack | null
}
