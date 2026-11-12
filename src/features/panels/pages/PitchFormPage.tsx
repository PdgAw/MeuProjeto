import { ArrowLeft, FileUp, Loader2, Lock, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CardSkeleton } from '@/components/shared/SectionCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { usePrimaryVenture, useVenture } from '@/features/ventures/api'
import { fmtBytes } from '@/lib/storage'
import { useMyPitches, useRound, useSavePitch, type PitchFields } from '../api'
import { PITCH_FIELDS, PITCH_STATUS } from '../components/labels'
import { PitchStatusTrack } from '../components/PitchStatusTrack'

const HINT: Record<string, string> = {
  problem: 'A dor real e quem sente.', solution: 'Como você resolve, de forma diferente.', market: 'Tamanho e perfil do mercado.',
  business_model: 'Como o negócio ganha dinheiro.', traction: 'Clientes, receita, crescimento, validações.', strategy: 'Próximos 12–18 meses.',
  team: 'Quem executa e por que vocês.', capital_use: 'Onde o investimento será aplicado.',
}

/** Formulário de pitch: pre-filled from Meu Negócio, editable while in draft/eligible. */
export default function PitchFormPage() {
  const { roundId } = useParams()
  const { user } = useAuth()
  const round = useRound(roundId)
  const primary = usePrimaryVenture(user?.user_id)
  const venture = useVenture(primary.data?.id)
  const pitches = useMyPitches(user?.user_id)
  const save = useSavePitch()
  const existing = pitches.data?.find((p) => p.round_id === roundId)
  const [v, setV] = useState<Record<string, string>>({})
  const [deck, setDeck] = useState<File | null>(null)

  useEffect(() => {
    if (pitches.isPending || venture.isPending) return
    const src = existing ?? null
    const vd = venture.data
    setV({
      problem: src?.problem ?? vd?.problem ?? '', solution: src?.solution ?? vd?.solution ?? '', market: src?.market ?? vd?.audience ?? '',
      business_model: src?.business_model ?? vd?.revenue_model ?? '', traction: src?.traction ?? '', strategy: src?.strategy ?? '',
      team: src?.team ?? vd?.team_description ?? '', capital_use: src?.capital_use ?? '', capital_needed: src?.capital_needed?.toString() ?? '',
    })
  }, [pitches.isPending, venture.isPending, existing, venture.data])

  if (!user) return null
  if (round.isPending || primary.isPending || pitches.isPending) return <CardSkeleton lines={5} />
  if (!round.data) return <p className="text-muted-foreground">Banca não encontrada.</p>
  if (!primary.data) return <p className="text-muted-foreground">Cadastre seu negócio em <Link to="/meu-negocio" className="text-primary underline">Meu Negócio</Link> para submeter um pitch.</p>
  const editable = !existing || existing.status === 'draft' || existing.status === 'eligible'
  const closed = round.data.status !== 'open' || (round.data.submissions_close_at && new Date(round.data.submissions_close_at) < new Date())

  const submit = (final: boolean) => {
    if (final && PITCH_FIELDS.some(([k]) => k !== 'capital_use' && !v[k]?.trim())) return toast.error('Preencha todos os campos antes de submeter.')
    if (final && !confirm('Submeter o pitch para a banca? Depois disso, alterações só pela coordenação.')) return
    const fields: PitchFields = { ...Object.fromEntries(PITCH_FIELDS.map(([k]) => [k, v[k]?.trim() || null])), capital_needed: v.capital_needed ? Number(v.capital_needed) : null }
    save.mutate({ id: existing?.id, roundId: round.data!.id, ventureId: primary.data!.id, userId: user.user_id, fields, deck, submit: final },
      { onSuccess: () => { setDeck(null); toast.success(final ? 'Pitch submetido! A coordenação foi avisada.' : 'Rascunho salvo.') }, onError: (e) => toast.error(e.message) })
  }

  return (
    <div className="space-y-6">
      <Link to="/bancas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Bancas</Link>
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">{round.data.name}</p>
        <h1 className="text-2xl font-semibold sm:text-3xl">Pitch · {primary.data.name}</h1>
        {existing && <PitchStatusTrack status={existing.status} />}
      </header>
      {!editable && (
        <Card className="border-primary/30"><CardContent className="flex items-center gap-3 pt-5 text-sm">
          <Lock className="h-4 w-4 text-primary" /> Pitch {PITCH_STATUS[existing!.status].label.toLowerCase()}. As notas da banca são confidenciais; a coordenação comunicará o resultado.
        </CardContent></Card>
      )}
      <Card><CardContent className="space-y-4 pt-5">
        <p className="text-sm text-muted-foreground">Os campos vieram pré-preenchidos de Meu Negócio. Ajuste para a banca.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {PITCH_FIELDS.map(([k, l]) => (
            <FormField key={k} id={`p-${k}`} label={l} hint={HINT[k]}>
              <Textarea id={`p-${k}`} rows={4} value={v[k] ?? ''} disabled={!editable} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
            </FormField>
          ))}
          <FormField id="p-cap" label="Necessidade de capital (R$)" hint="Deixe em branco se não busca investimento agora.">
            <Input id="p-cap" type="number" min={0} value={v.capital_needed ?? ''} disabled={!editable} onChange={(e) => setV({ ...v, capital_needed: e.target.value })} />
          </FormField>
          <FormField id="p-deck" label="Pitch deck (PDF)">
            <div className="flex flex-wrap items-center gap-2">
              {(existing?.pitch_deck_path || primary.data && venture.data?.pitch_deck_path) && <Badge variant="secondary">Deck enviado</Badge>}
              {editable && (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-secondary">
                  <FileUp className="h-4 w-4" />{deck ? `${deck.name} · ${fmtBytes(deck.size)}` : 'Escolher arquivo'}
                  <input type="file" accept=".pdf,.ppt,.pptx,.key" className="sr-only" onChange={(e) => setDeck(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>
          </FormField>
        </div>
        {editable && (
          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" disabled={save.isPending} onClick={() => submit(false)}>Salvar rascunho</Button>
            <Button disabled={save.isPending || Boolean(closed)} onClick={() => submit(true)} title={closed ? 'Inscrições encerradas' : undefined}>
              {save.isPending ? <Loader2 className="animate-spin" /> : <Send />}Submeter à banca
            </Button>
          </div>
        )}
      </CardContent></Card>
    </div>
  )
}
