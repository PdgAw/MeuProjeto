import { ExternalLink, FileUp, Globe, PlayCircle, Presentation } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { SectionCard } from '@/components/shared/SectionCard'
import { stageLabel } from '@/config/labels'
import { openStoredFile } from '@/lib/storage'
import { useUploadPitchDeck, type VentureDetail } from '../api'
import { CommentsThread } from './CommentsThread'

const CANVAS = [
  ['problem', 'Problema'], ['solution', 'Solução'], ['audience', 'Público'],
  ['value_proposition', 'Proposta de valor'], ['revenue_model', 'Modelo de receita'], ['team_description', 'Equipe'],
] as const

export function OverviewTab({ venture: v, editable }: { venture: VentureDetail; editable: boolean }) {
  const upload = useUploadPitchDeck(v.id)
  const history = [...v.venture_stage_history].sort((a, b) => b.changed_at.localeCompare(a.changed_at))
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] [&>*]:min-w-0">
      <div className="space-y-6">
        {v.description && <p className="leading-relaxed">{v.description}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {CANVAS.map(([k, l]) => (
            <Card key={k}><CardContent className="pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{l}</p>
              <p className="mt-1.5 whitespace-pre-line text-sm">{v[k] || <span className="text-muted-foreground">A preencher</span>}</p>
            </CardContent></Card>
          ))}
        </div>
        <SectionCard title="Comentários gerais"><CommentsThread ventureId={v.id} comments={v.venture_comments} /></SectionCard>
      </div>
      <div className="space-y-6">
        <Card><CardContent className="space-y-3 pt-5 text-sm">
          {v.segment && <p><span className="text-muted-foreground">Segmento:</span> {v.segment}</p>}
          {v.business_model && <p><span className="text-muted-foreground">Modelo:</span> {v.business_model}</p>}
          {v.website_url && <a href={v.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline"><Globe className="h-4 w-4" />Site</a>}
          {v.pitch_url && <a href={v.pitch_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline"><PlayCircle className="h-4 w-4" />Vídeo de pitch</a>}
          {v.pitch_deck_path ? (
            <button onClick={() => void openStoredFile('ventures', v.pitch_deck_path!).catch((e) => toast.error(e.message))} className="flex items-center gap-2 text-primary hover:underline"><Presentation className="h-4 w-4" />Pitch deck<ExternalLink className="h-3 w-3" /></button>
          ) : <p className="text-muted-foreground">Sem pitch deck enviado.</p>}
          {editable && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 hover:bg-secondary">
              <FileUp className="h-4 w-4" />{upload.isPending ? 'Enviando…' : v.pitch_deck_path ? 'Substituir pitch deck' : 'Enviar pitch deck (PDF)'}
              <input type="file" accept=".pdf,.ppt,.pptx,.key" className="sr-only" disabled={upload.isPending}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f, { onSuccess: () => toast.success('Pitch deck enviado.'), onError: (er) => toast.error(er.message) }) }} />
            </label>
          )}
          <p className="text-xs text-muted-foreground">{v.visibility === 'community' ? 'Nome, segmento e estágio aparecem na Comunidade Neo.' : 'Negócio privado: só você, seus Neomentores e a coordenação.'}</p>
        </CardContent></Card>
        <SectionCard title="Evolução do estágio">
          <ol className="space-y-3 border-l-2 border-primary/30 pl-4 text-sm">
            {history.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[1.4rem] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                <p className="font-medium">{stageLabel(h.to_stage)}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(h.changed_at), "dd 'de' MMM yyyy", { locale: ptBR })}</p>
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>
    </div>
  )
}
