// =============================================================================
// invite-user — the only way accounts are created on the private NeoLevel platform.
//
// POST { email, full_name, role_key, job_title?, cohort_id?, track?, candidate_id? }
// Authorization: Bearer <caller's access token>
//
// Rules (enforced here AND in the database triggers):
//  - caller needs users.create
//  - staff roles (director, coordinator, secretary, staff) also require permissions.manage
//  - only a super admin may invite another super admin
//  - candidate_id: converts an approved admissions candidate (no duplicated data)
// =============================================================================
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'
import { corsHeaders, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '')

const STAFF_ROLES = new Set(['director', 'coordinator', 'secretary', 'staff'])
const TRACKS = new Set(['founder', 'successor', 'other'])
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface InvitePayload {
  email?: string
  full_name?: string
  role_key?: string
  job_title?: string
  cohort_id?: string
  track?: string
  track_other_label?: string
  candidate_id?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  // 1. Identify the caller with their own JWT (RLS applies to this client).
  const authHeader = req.headers.get('Authorization') ?? ''
  const caller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: callerUser, error: callerError } = await caller.auth.getUser()
  if (callerError || !callerUser.user) return json({ error: 'Sessão inválida.' }, 401)

  let body: InvitePayload
  try {
    body = await req.json()
  } catch {
    return json({ error: 'JSON inválido.' }, 400)
  }

  const email = body.email?.trim().toLowerCase() ?? ''
  const fullName = body.full_name?.trim() ?? ''
  const roleKey = body.role_key?.trim() ?? ''
  if (!EMAIL_RE.test(email)) return json({ error: 'E-mail inválido.' }, 400)
  if (fullName.length < 3) return json({ error: 'Informe o nome completo.' }, 400)
  if (body.track && !TRACKS.has(body.track)) return json({ error: 'Trilha inválida.' }, 400)

  // 2. Authorize through the database's own RBAC functions.
  const can = async (perm: string) => {
    const { data } = await caller.rpc('has_permission', { p_permission: perm })
    return data === true
  }
  const { data: isSuper } = await caller.rpc('is_super_admin')
  if (!(await can('users.create'))) return json({ error: 'Você não tem permissão para convidar usuários.' }, 403)
  if (roleKey === 'super_admin' && !isSuper) return json({ error: 'Somente Super Administradores podem convidar este cargo.' }, 403)
  if (STAFF_ROLES.has(roleKey) && !(await can('permissions.manage'))) {
    return json({ error: 'Convidar cargos de gestão exige a permissão permissions.manage.' }, 403)
  }
  if (body.candidate_id && !(await can('admissions.manage'))) {
    return json({ error: 'Converter candidatos exige admissions.manage.' }, 403)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const { data: role } = await admin.from('roles').select('id, key').eq('key', roleKey).maybeSingle()
  if (!role) return json({ error: 'Cargo inexistente.' }, 400)

  // 3. Send the invite. The e-mail link lands on /primeiro-acesso, where the user sets a password.
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${APP_URL}/primeiro-acesso`,
  })
  if (inviteError || !invited.user) {
    const already = inviteError?.message?.toLowerCase().includes('already')
    return json({ error: already ? 'Este e-mail já tem acesso à plataforma.' : inviteError?.message ?? 'Falha no convite.' }, already ? 409 : 500)
  }
  const userId = invited.user.id

  // 4. Role + profile data (profile rows were created by the on_auth_user_created trigger).
  const steps: PromiseLike<{ error: unknown }>[] = [
    admin.from('user_roles').insert({ user_id: userId, role_id: role.id, granted_by: callerUser.user.id }),
    admin.from('profiles').update({ full_name: fullName, job_title: body.job_title ?? null, must_change_password: true }).eq('id', userId),
  ]
  for (const step of steps) {
    const { error } = await step
    if (error) return json({ error: 'Usuário convidado, mas houve falha ao configurar o perfil.', detail: String(error) }, 500)
  }

  // 5. Neoleader setup: candidate conversion, or track + enrollment.
  if (body.candidate_id) {
    const { error } = await admin.rpc('convert_candidate_to_neoleader', {
      p_candidate: body.candidate_id, p_user: userId, p_cohort: body.cohort_id ?? null,
    })
    if (error) return json({ error: 'Convite enviado, mas a conversão do candidato falhou.', detail: error.message }, 500)
  } else if (roleKey === 'neoleader') {
    const { error: npError } = await admin.from('neoleader_profiles').insert({
      user_id: userId,
      track: body.track ?? 'founder',
      track_other_label: body.track === 'other' ? body.track_other_label ?? 'Outro' : null,
      track_approved_by: callerUser.user.id,
    })
    if (npError) return json({ error: 'Convite enviado, mas falhou ao criar a trilha.', detail: npError.message }, 500)
    if (body.cohort_id) {
      const { error } = await admin.from('enrollments').insert({ user_id: userId, cohort_id: body.cohort_id })
      if (error) return json({ error: 'Convite enviado, mas a matrícula falhou.', detail: error.message }, 500)
    }
  }

  return json({ user_id: userId, email, role: role.key }, 201)
})
