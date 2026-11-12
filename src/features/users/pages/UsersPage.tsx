import { Search, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { TRACK_LABEL } from '@/config/labels'
import { useCohortOptions } from '@/features/admissions/api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { fmtRelative } from '@/lib/format'
import { initials } from '@/lib/utils'
import { STATUS_LABEL, useInvite, useRbac, useUsers, type UserStatus } from '../api'

const STAFF_ROLES = new Set(['super_admin', 'director', 'coordinator', 'secretary'])

export default function UsersPage() {
  const { hasPermission } = useAuth()
  const { data, isPending } = useUsers()
  const rbac = useRbac()
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const list = (data ?? []).filter((u) => (!q || u.full_name.toLowerCase().includes(q.toLowerCase()) || (u.email ?? '').toLowerCase().includes(q.toLowerCase()))
    && (!role || u.roles.some((r) => r.key === role)) && (!status || u.status === status))
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold sm:text-3xl">Usuários e permissões</h1><p className="mt-1 text-muted-foreground">{data?.length ?? 0} pessoas com acesso · {(data ?? []).filter((u) => u.status === 'invited').length} convites pendentes</p></div>
        {hasPermission('users.create') && <InviteDialog />}
      </header>
      <div className="flex flex-wrap gap-2">
        <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar usuário" /></div>
        <Select className="w-44" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Cargo"><option value="">Todos os cargos</option>{rbac.data?.roles.map((r) => <option key={r.id} value={r.key}>{r.name}</option>)}</Select>
        <Select className="w-40" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">Todos os status</option>{Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
      </div>
      {isPending ? <CardSkeleton lines={6} /> : !list.length ? <EmptyState text="Nenhum usuário encontrado." /> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-2.5">Pessoa</th><th className="px-3 py-2.5">Cargos</th><th className="px-3 py-2.5">Status</th><th className="px-4 py-2.5">Último acesso</th></tr></thead>
            <tbody className="divide-y">{list.map((u) => (
              <tr key={u.id} className="hover:bg-secondary/30">
                <td className="px-4 py-2.5"><Link to={`/gestao/usuarios/${u.id}`} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">{u.avatar_url && <AvatarImage src={u.avatar_url} alt="" />}<AvatarFallback className="text-xs">{initials(u.full_name)}</AvatarFallback></Avatar>
                  <span className="min-w-0"><span className="block font-medium hover:underline">{u.full_name}</span><span className="block truncate text-xs text-muted-foreground">{u.email ?? u.job_title ?? ''}</span></span></Link></td>
                <td className="px-3 py-2.5"><div className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r.id} variant={STAFF_ROLES.has(r.key) ? 'default' : 'secondary'}>{r.name}</Badge>)}</div></td>
                <td className="px-3 py-2.5"><StatusBadge s={u.status} /></td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{u.last_seen_at ? fmtRelative(u.last_seen_at) : 'nunca'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function StatusBadge({ s }: { s: UserStatus }) {
  return <Badge variant={s === 'active' ? 'success' : s === 'invited' ? 'warning' : s === 'suspended' ? 'destructive' : 'outline'}>{STATUS_LABEL[s]}</Badge>
}

function InviteDialog() {
  const { hasPermission, user } = useAuth()
  const rbac = useRbac()
  const cohorts = useCohortOptions()
  const invite = useInvite()
  const [open, setOpen] = useState(false)
  const [v, setV] = useState({ email: '', full_name: '', role_key: 'neoleader', job_title: '', cohort_id: '', track: 'founder', track_other_label: '' })
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }))
  const isSuper = user?.roles.some((r) => r.key === 'super_admin')
  const roles = (rbac.data?.roles ?? []).filter((r) => (r.key !== 'super_admin' || isSuper) && (!STAFF_ROLES.has(r.key) || hasPermission('permissions.manage')))
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setV({ email: '', full_name: '', role_key: 'neoleader', job_title: '', cohort_id: '', track: 'founder', track_other_label: '' }) }}>
      <Button onClick={() => setOpen(true)}><UserPlus />Convidar</Button>
      <DialogContent title="Convidar pessoa" description="Ela recebe um e-mail para criar a senha no primeiro acesso.">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault()
          const neo = v.role_key === 'neoleader'
          invite.mutate({ email: v.email.trim(), full_name: v.full_name.trim(), role_key: v.role_key, job_title: v.job_title || undefined,
            cohort_id: neo && v.cohort_id ? v.cohort_id : undefined, track: neo ? v.track : undefined, track_other_label: neo && v.track === 'other' ? v.track_other_label : undefined },
          { onSuccess: () => { toast.success(`Convite enviado para ${v.email}.`); setOpen(false) }, onError: (er) => toast.error(er.message) })
        }}>
          <FormField id="iv-name" label="Nome completo"><Input id="iv-name" required minLength={3} value={v.full_name} onChange={set('full_name')} /></FormField>
          <FormField id="iv-email" label="E-mail"><Input id="iv-email" type="email" required value={v.email} onChange={set('email')} /></FormField>
          <FormField id="iv-role" label="Cargo"><Select id="iv-role" value={v.role_key} onChange={set('role_key')}>{roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}</Select></FormField>
          {v.role_key === 'neoleader' ? (<>
            <FormField id="iv-track" label="Trilha"><Select id="iv-track" value={v.track} onChange={set('track')}>{Object.entries(TRACK_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></FormField>
            {v.track === 'other' && <FormField id="iv-other" label="Descrição do perfil especial"><Input id="iv-other" value={v.track_other_label} onChange={set('track_other_label')} /></FormField>}
            <FormField id="iv-cohort" label="Turma"><Select id="iv-cohort" value={v.cohort_id} onChange={set('cohort_id')}><option value="">Sem matrícula por enquanto</option>{cohorts.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></FormField>
          </>) : <FormField id="iv-job" label="Cargo/função exibido"><Input id="iv-job" value={v.job_title} onChange={set('job_title')} placeholder="Ex.: Coordenadora acadêmica" /></FormField>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={invite.isPending}>{invite.isPending ? 'Enviando…' : 'Enviar convite'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
