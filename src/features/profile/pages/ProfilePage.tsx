import { Camera, Eye, EyeOff, Loader2, Lock, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CardSkeleton, SectionCard } from '@/components/shared/SectionCard'
import { TRACK_LABEL } from '@/config/labels'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { initials } from '@/lib/utils'
import { useMyProfile, useSaveProfile, useUploadAvatar, type Privacy } from '../api'

const PRIVACY: [keyof Privacy, string][] = [
  ['directory', 'Aparecer na Comunidade Neo'], ['cohort', 'Mostrar minha turma'], ['city', 'Mostrar minha cidade'], ['bio', 'Mostrar minha bio'],
  ['linkedin', 'Mostrar meu LinkedIn'], ['interests', 'Mostrar meus interesses'], ['competencies', 'Mostrar minhas competências'], ['venture', 'Mostrar nome e estágio do meu negócio'],
]
const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { data, isPending } = useMyProfile(user?.user_id)
  const save = useSaveProfile(user?.user_id ?? '')
  const avatar = useUploadAvatar(user?.user_id ?? '')
  const [v, setV] = useState<Record<string, string>>({})
  const [privacy, setPrivacy] = useState<Privacy | null>(null)
  useEffect(() => {
    if (!data) return
    const d = data.details
    setV({ full_name: data.profile.full_name, preferred_name: data.profile.preferred_name ?? '', job_title: data.profile.job_title ?? '', company: data.profile.company ?? '',
      bio: d.bio ?? '', city: d.city ?? '', linkedin_url: d.linkedin_url ?? '', website_url: d.website_url ?? '',
      interests: d.interests.join(', '), competencies: d.competencies.join(', '), sectors: d.sectors.join(', '), phone: data.priv.phone ?? '' })
    setPrivacy(d.privacy)
  }, [data])
  if (!user) return null
  if (isPending || !privacy) return <CardSkeleton lines={5} />
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value })
  const professional = user.roles.some((r) => r.key === 'teacher' || r.key === 'mentor')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (v.full_name.trim().length < 3) return toast.error('Informe seu nome completo.')
    for (const k of ['linkedin_url', 'website_url']) if (v[k] && !/^https?:\/\//.test(v[k])) return toast.error('Links devem começar com https://')
    save.mutate({
      profile: { full_name: v.full_name.trim(), preferred_name: v.preferred_name.trim() || null, job_title: v.job_title.trim() || null, company: v.company.trim() || null },
      details: { bio: v.bio.trim() || null, city: v.city.trim() || null, linkedin_url: v.linkedin_url.trim() || null, website_url: v.website_url.trim() || null,
        interests: list(v.interests), competencies: list(v.competencies), sectors: list(v.sectors), privacy },
      phone: v.phone.trim() || null,
    }, { onSuccess: () => { toast.success('Perfil salvo.'); void refreshUser() }, onError: (er) => toast.error(er.message) })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <header className="flex flex-wrap items-center gap-5">
        <label className="group relative cursor-pointer">
          <Avatar className="h-24 w-24">{data?.profile.avatar_url && <AvatarImage src={data.profile.avatar_url} alt="" />}<AvatarFallback className="text-2xl">{initials(data?.profile.full_name)}</AvatarFallback></Avatar>
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">{avatar.isPending ? <Loader2 className="animate-spin" /> : <Camera />}</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Trocar foto"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) avatar.mutate(f, { onSuccess: () => toast.success('Foto atualizada.'), onError: (er) => toast.error(er.message) }) }} />
        </label>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold sm:text-3xl">{data?.profile.full_name}</h1>
          <div className="flex flex-wrap gap-1.5">{user.roles.map((r) => <Badge key={r.key}>{r.name}</Badge>)}{user.cohort && <Badge variant="outline">{user.cohort.name}</Badge>}{user.track && <Badge variant="accent">{TRACK_LABEL[user.track]}</Badge>}</div>
          {professional && <Link to={`/professores/${user.user_id}`} className="text-sm text-primary hover:underline">Editar perfil profissional (especialidades, links)</Link>}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] [&>*]:min-w-0">
        <div className="space-y-6">
          <SectionCard title="Identidade">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="pf-name" label="Nome completo"><Input id="pf-name" value={v.full_name} onChange={set('full_name')} /></FormField>
              <FormField id="pf-pref" label="Como prefere ser chamado(a)"><Input id="pf-pref" value={v.preferred_name} onChange={set('preferred_name')} /></FormField>
              <FormField id="pf-job" label="Cargo / ocupação"><Input id="pf-job" value={v.job_title} onChange={set('job_title')} /></FormField>
              <FormField id="pf-comp" label="Empresa"><Input id="pf-comp" value={v.company} onChange={set('company')} /></FormField>
            </div>
          </SectionCard>
          <SectionCard title="Sobre mim">
            <div className="space-y-4">
              <FormField id="pf-bio" label="Bio"><Textarea id="pf-bio" rows={4} value={v.bio} onChange={set('bio')} /></FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="pf-city" label="Cidade"><Input id="pf-city" value={v.city} onChange={set('city')} /></FormField>
                <FormField id="pf-li" label="LinkedIn"><Input id="pf-li" type="url" value={v.linkedin_url} onChange={set('linkedin_url')} /></FormField>
                <FormField id="pf-site" label="Site"><Input id="pf-site" type="url" value={v.website_url} onChange={set('website_url')} /></FormField>
                <FormField id="pf-sec" label="Setores" hint="Separe por vírgulas"><Input id="pf-sec" value={v.sectors} onChange={set('sectors')} /></FormField>
                <FormField id="pf-int" label="Interesses" hint="Separe por vírgulas"><Input id="pf-int" value={v.interests} onChange={set('interests')} /></FormField>
                <FormField id="pf-compt" label="Competências" hint="Separe por vírgulas"><Input id="pf-compt" value={v.competencies} onChange={set('competencies')} /></FormField>
              </div>
            </div>
          </SectionCard>
        </div>
        <div className="space-y-6">
          <SectionCard title="Privacidade na Comunidade">
            <ul className="space-y-2">
              {PRIVACY.map(([k, l]) => (
                <li key={k}>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md p-2 text-sm hover:bg-secondary/50">
                    <span className="flex items-center gap-2">{privacy[k] ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}{l}</span>
                    <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={privacy[k]} disabled={k !== 'directory' && !privacy.directory}
                      onChange={(e) => setPrivacy({ ...privacy, [k]: e.target.checked })} />
                  </label>
                </li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard title={<span className="flex items-center gap-2"><Lock className="h-4 w-4" />Contato privado</span>}>
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">E-mail:</span> {data?.priv.email}</p>
              <FormField id="pf-phone" label="Telefone"><Input id="pf-phone" type="tel" value={v.phone} onChange={set('phone')} /></FormField>
              <p className="text-xs text-muted-foreground">Visível só para você e a secretaria. Nunca aparece na Comunidade.</p>
            </div>
          </SectionCard>
        </div>
      </div>
      <div className="sticky bottom-20 flex justify-end lg:bottom-4"><Button type="submit" size="lg" disabled={save.isPending} className="shadow-lg">{save.isPending ? <Loader2 className="animate-spin" /> : <Save />}Salvar perfil</Button></div>
    </form>
  )
}
