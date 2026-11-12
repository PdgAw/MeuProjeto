import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { inviteUser, type InviteBody } from '@/lib/invite'
import type { Database } from '@/types/database'

export type UserStatus = Database['public']['Enums']['user_status']
export const STATUS_LABEL: Record<UserStatus, string> = { invited: 'Convidado', active: 'Ativo', inactive: 'Inativo', suspended: 'Suspenso', alumni: 'Alumni' }

export function useUsers() {
  return useQuery({
    queryKey: ['users', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles')
        .select('id, full_name, avatar_url, job_title, status, last_seen_at, created_at, private:profile_private(email), user_roles!user_roles_user_id_fkey(role:roles(id, key, name, priority))')
        .order('full_name')
      if (error) throw error
      return data.map((u) => ({ ...u, email: u.private?.email ?? null, roles: u.user_roles.map((r) => r.role).filter(Boolean).sort((a, b) => a!.priority - b!.priority) as { id: string; key: string; name: string; priority: number }[] }))
    },
  })
}
export type UserRow = NonNullable<ReturnType<typeof useUsers>['data']>[number]

export function useRbac() {
  return useQuery({
    queryKey: ['rbac'],
    staleTime: 60_000,
    queryFn: async () => {
      const [roles, perms, rp] = await Promise.all([
        supabase.from('roles').select('id, key, name, description, dashboard, priority, is_system').order('priority'),
        supabase.from('permissions').select('key, module, description').order('module').order('key'),
        supabase.from('role_permissions').select('role_id, permission_key'),
      ])
      if (roles.error) throw roles.error
      if (perms.error) throw perms.error
      if (rp.error) throw rp.error
      return { roles: roles.data, permissions: perms.data, rolePerms: rp.data }
    },
  })
}

export function useUserAccess(id: string | undefined) {
  return useQuery({
    queryKey: ['users', 'access', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const [p, roles, overrides] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url, job_title, status, last_seen_at, created_at, private:profile_private(email, phone)').eq('id', id!).single(),
        supabase.from('user_roles').select('role_id, granted_at').eq('user_id', id!),
        supabase.from('user_permissions').select('permission_key, effect').eq('user_id', id!),
      ])
      if (p.error) throw p.error
      return { profile: p.data, roleIds: (roles.data ?? []).map((r) => r.role_id), overrides: overrides.data ?? [] }
    },
  })
}

function useInv() {
  const qc = useQueryClient()
  return () => { void qc.invalidateQueries({ queryKey: ['users'] }); void qc.invalidateQueries({ queryKey: ['rbac'] }) }
}

export function useSetUserStatus() {
  const inv = useInv()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: UserStatus }) => {
      const { error } = await supabase.from('profiles').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: inv,
  })
}

export function useToggleRole() {
  const inv = useInv()
  return useMutation({
    mutationFn: async ({ userId, roleId, on }: { userId: string; roleId: string; on: boolean }) => {
      const { error } = on
        ? await supabase.from('user_roles').insert({ user_id: userId, role_id: roleId })
        : await supabase.from('user_roles').delete().eq('user_id', userId).eq('role_id', roleId)
      if (error) throw error
    },
    onSuccess: inv,
  })
}

export function useSetOverride() {
  const inv = useInv()
  return useMutation({
    mutationFn: async ({ userId, key, effect }: { userId: string; key: string; effect: 'grant' | 'revoke' | null }) => {
      const { error } = effect
        ? await supabase.from('user_permissions').upsert({ user_id: userId, permission_key: key, effect }, { onConflict: 'user_id,permission_key' })
        : await supabase.from('user_permissions').delete().eq('user_id', userId).eq('permission_key', key)
      if (error) throw error
    },
    onSuccess: inv,
  })
}

export function useToggleRolePermission() {
  const inv = useInv()
  return useMutation({
    mutationFn: async ({ roleId, key, on }: { roleId: string; key: string; on: boolean }) => {
      const { error } = on
        ? await supabase.from('role_permissions').insert({ role_id: roleId, permission_key: key })
        : await supabase.from('role_permissions').delete().eq('role_id', roleId).eq('permission_key', key)
      if (error) throw error
    },
    onSuccess: inv,
  })
}

export function useInvite() {
  const inv = useInv()
  return useMutation({ mutationFn: (b: InviteBody) => inviteUser(b), onSuccess: inv })
}

export const MODULE_LABEL: Record<string, string> = {
  users: 'Usuários', students: 'Neoleaders', classes: 'Turmas', subjects: 'Disciplinas', lessons: 'Aulas', attendance: 'Presença', assignments: 'Entregas',
  mentoring: 'Neomentoria', ventures: 'Negócios', panels: 'Bancas', events: 'Experiências e eventos', community: 'Comunidade', chat: 'Chat',
  announcements: 'Comunicados', documents: 'Documentos', admissions: 'Admissões', finance: 'Financeiro', requests: 'Solicitações', reports: 'Relatórios', settings: 'Configurações',
}
