import { ArrowLeft, Mail } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { CardSkeleton, SectionCard } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { fmtRelative } from '@/lib/format'
import { cn, initials } from '@/lib/utils'
import { MODULE_LABEL, STATUS_LABEL, useRbac, useSetOverride, useSetUserStatus, useToggleRole, useUserAccess, type UserStatus } from '../api'
import { StatusBadge } from './UsersPage'

/** One person's access: status, roles and individual permission overrides. */
export default function UserAccessPage() {
  const { id } = useParams()
  const { hasPermission, user: me } = useAuth()
  const { data, isPending } = useUserAccess(id)
  const rbac = useRbac()
  const setStatus = useSetUserStatus()
  const toggleRole = useToggleRole()
  const setOverride = useSetOverride()
  if (isPending || rbac.isPending) return <CardSkeleton lines={6} />
  if (!data || !id || !rbac.data) return <p className="text-muted-foreground">Usuário não encontrado.</p>
  const self = me?.user_id === id
  const isSuper = me?.roles.some((r) => r.key === 'super_admin')
  const canPerms = hasPermission('permissions.manage') && !self
  const fromRoles = new Set(rbac.data.rolePerms.filter((rp) => data.roleIds.includes(rp.role_id)).map((rp) => rp.permission_key))
  const superRole = rbac.data.roles.find((r) => r.key === 'super_admin')
  const isTargetSuper = Boolean(superRole && data.roleIds.includes(superRole.id))
  const ov = new Map(data.overrides.map((o) => [o.permission_key, o.effect]))
  const modules = [...new Set(rbac.data.permissions.map((p) => p.module))]
  const onErr = (e: Error) => toast.error(e.message)
  return (
    <div className="space-y-6">
      <Link to="/gestao/usuarios" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Usuários</Link>
      <Card><CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
        <Avatar className="h-16 w-16">{data.profile.avatar_url && <AvatarImage src={data.profile.avatar_url} alt="" />}<AvatarFallback>{initials(data.profile.full_name)}</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{data.profile.full_name}</h1>
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">{data.profile.private?.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{data.profile.private.email}</span>}
            <span>Último acesso {data.profile.last_seen_at ? fmtRelative(data.profile.last_seen_at) : 'nunca'}</span></p>
        </div>
        {hasPermission('users.edit') && !self ? (
          <Select className="w-40" aria-label="Status do usuário" value={data.profile.status} onChange={(e) => setStatus.mutate({ id, status: e.target.value as UserStatus }, { onSuccess: () => toast.success('Status atualizado.'), onError: onErr })}>
            {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        ) : <StatusBadge s={data.profile.status} />}
      </CardContent></Card>
      {data.roleIds.some((r) => rbac.data.roles.find((x) => x.id === r)?.key === 'neoleader') && <Link to={`/gestao/neoleaders/${id}`} className="text-sm font-medium text-primary hover:underline">Abrir Perfil 360º do Neoleader →</Link>}

      <SectionCard title="Cargos">
        <div className="flex flex-wrap gap-2">{rbac.data.roles.map((r) => {
          const on = data.roleIds.includes(r.id)
          const locked = !canPerms || (r.key === 'super_admin' && !isSuper)
          return (
            <label key={r.id} className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm', on && 'border-primary bg-primary/10', locked && 'opacity-60')}>
              <input type="checkbox" className="h-4 w-4 accent-primary" checked={on} disabled={locked || toggleRole.isPending}
                onChange={(e) => toggleRole.mutate({ userId: id, roleId: r.id, on: e.target.checked }, { onSuccess: () => toast.success(e.target.checked ? `Cargo ${r.name} concedido.` : `Cargo ${r.name} removido.`), onError: onErr })} />{r.name}
            </label>
          )
        })}</div>
        {self && <p className="mt-3 text-xs text-muted-foreground">Você não pode alterar os próprios cargos ou permissões.</p>}
      </SectionCard>

      <SectionCard title="Permissões">
        {isTargetSuper ? <p className="text-sm text-muted-foreground">Super Administradores têm todas as permissões.</p> : (<>
          <p className="mb-4 text-sm text-muted-foreground">Herdadas dos cargos ou ajustadas individualmente. Ajustes individuais prevalecem sobre o cargo.</p>
          <div className="space-y-5">{modules.map((m) => (
            <div key={m}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{MODULE_LABEL[m] ?? m}</h3>
              <ul className="divide-y rounded-lg border">{rbac.data.permissions.filter((p) => p.module === m).map((p) => {
                const o = ov.get(p.key)
                const effective = o === 'grant' ? true : o === 'revoke' ? false : fromRoles.has(p.key)
                return (
                  <li key={p.key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="min-w-0"><span className={cn('block', !effective && 'text-muted-foreground')}>{p.description}</span><code className="text-[11px] text-muted-foreground">{p.key}</code></span>
                    <span className="flex items-center gap-2">
                      <Badge variant={effective ? 'success' : 'outline'}>{effective ? 'Permitido' : 'Sem acesso'}</Badge>
                      {canPerms && (p.key !== 'permissions.manage' || isSuper) ? (
                        <Select className="h-8 w-40 text-xs" aria-label={`Ajuste ${p.key}`} value={o ?? ''} onChange={(e) => setOverride.mutate({ userId: id, key: p.key, effect: (e.target.value || null) as 'grant' | 'revoke' | null }, { onSuccess: () => toast.success('Permissão ajustada.'), onError: onErr })}>
                          <option value="">{fromRoles.has(p.key) ? 'Do cargo (sim)' : 'Do cargo (não)'}</option><option value="grant">Conceder</option><option value="revoke">Revogar</option>
                        </Select>
                      ) : o ? <Badge variant="secondary">{o === 'grant' ? 'Concedida' : 'Revogada'} individualmente</Badge> : null}
                    </span>
                  </li>
                )
              })}</ul>
            </div>
          ))}</div>
        </>)}
      </SectionCard>
    </div>
  )
}
