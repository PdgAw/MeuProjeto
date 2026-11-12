import { ExternalLink, FileText, Link2, Plus, PlayCircle, Presentation, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CardSkeleton, EmptyState } from '@/components/shared/SectionCard'
import { fmtRelative } from '@/lib/format'
import { fmtBytes, openStoredFile } from '@/lib/storage'
import { useDeleteMaterial, useMaterials, type Material } from '../../api'
import { MaterialFormDialog } from '../MaterialFormDialog'

const ICON = { file: FileText, link: Link2, video: PlayCircle, slides: Presentation }

export function MaterialsTab({ subjectId, lessonId, canTeach, lessons }: {
  subjectId: string; lessonId?: string; canTeach: boolean; lessons: { id: string; title: string }[]
}) {
  const { data, isPending } = useMaterials(subjectId, lessonId)
  const del = useDeleteMaterial(subjectId)
  const [adding, setAdding] = useState(false)

  const open = async (m: Material) => {
    try {
      if (m.storage_path) await openStoredFile('lesson-materials', m.storage_path)
      else if (m.url) window.open(m.url, '_blank', 'noopener')
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)) }
  }

  return (
    <div className="space-y-4">
      {canTeach && <div className="flex justify-end"><Button onClick={() => setAdding(true)}><Plus /> Publicar material</Button></div>}
      {isPending ? <CardSkeleton /> : !data?.length ? <EmptyState text="Nenhum material publicado ainda." /> : (
        <ul className="divide-y rounded-lg border bg-card">
          {data.map((m) => {
            const Icon = ICON[m.kind]
            return (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                <button onClick={() => void open(m)} className="min-w-0 flex-1 text-left">
                  <p className="truncate font-medium hover:underline">{m.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[m.lesson?.title, m.file_name && fmtBytes(m.size_bytes), fmtRelative(m.created_at)].filter(Boolean).join(' · ')}
                  </p>
                </button>
                <Button size="icon" variant="ghost" onClick={() => void open(m)} aria-label="Abrir"><ExternalLink className="h-4 w-4" /></Button>
                {canTeach && (
                  <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => {
                    if (confirm(`Remover "${m.title}"?`)) del.mutate(m, { onSuccess: () => toast.success('Material removido.') })
                  }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <MaterialFormDialog open={adding} onOpenChange={setAdding} subjectId={subjectId} lessons={lessons} defaultLessonId={lessonId} />
    </div>
  )
}
