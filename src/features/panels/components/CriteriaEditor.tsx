import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSaveCriterion, type Criterion } from '../api'

/** Criteria are configured by coordination per round — never fixed in code. */
export function CriteriaEditor({ roundId, criteria, editable, locked }: { roundId: string; criteria: Criterion[]; editable: boolean; locked: boolean }) {
  const save = useSaveCriterion(roundId)
  const [n, setN] = useState({ name: '', weight: '1' })
  const list = [...criteria].sort((a, b) => a.sort_order - b.sort_order)
  const totalW = list.reduce((s, c) => s + Number(c.weight), 0)
  return (
    <div className="space-y-3">
      {locked && <p className="rounded-md bg-warning/10 p-3 text-sm text-warning">Já existem avaliações: alterar critérios agora muda o resultado.</p>}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[32rem] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-2.5">Critério</th><th className="px-3 py-2.5 text-right">Peso</th><th className="px-3 py-2.5 text-right">% do total</th><th className="px-3 py-2.5 text-right">Nota máx.</th>{editable && <th />}</tr></thead>
          <tbody className="divide-y">
            {list.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2.5"><p className="font-medium">{c.name}</p>{c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}</td>
                <td className="px-3 py-2.5 text-right">
                  {editable ? <Input type="number" step="0.5" min="0.5" className="ml-auto h-8 w-20 text-right" defaultValue={Number(c.weight)} aria-label={`Peso de ${c.name}`}
                    onBlur={(e) => { const w = Number(e.target.value); if (w > 0 && w !== Number(c.weight)) save.mutate({ id: c.id, name: c.name, description: c.description, weight: w, max_score: Number(c.max_score), sort_order: c.sort_order }) }} /> : Number(c.weight)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{totalW ? Math.round((100 * Number(c.weight)) / totalW) : 0}%</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{Number(c.max_score)}</td>
                {editable && <td className="px-2"><Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Remover ${c.name}`} onClick={() => { if (confirm(`Remover o critério "${c.name}"?`)) save.mutate({ id: c.id, name: c.name, weight: 1, max_score: 10, remove: true }) }}><Trash2 className="h-4 w-4" /></Button></td>}
              </tr>
            ))}
            {!list.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Nenhum critério. Adicione os critérios desta banca.</td></tr>}
          </tbody>
        </table>
      </div>
      {editable && (
        <form className="flex gap-2" onSubmit={(e) => {
          e.preventDefault()
          if (!n.name.trim()) return
          save.mutate({ name: n.name.trim(), weight: Number(n.weight) || 1, max_score: 10, sort_order: list.length + 1 }, { onSuccess: () => setN({ name: '', weight: '1' }), onError: (er) => toast.error(er.message) })
        }}>
          <Input placeholder="Novo critério (ex.: Tração)" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} aria-label="Novo critério" />
          <Input type="number" step="0.5" min="0.5" className="w-24" value={n.weight} onChange={(e) => setN({ ...n, weight: e.target.value })} aria-label="Peso" />
          <Button type="submit" variant="outline"><Plus /> Critério</Button>
        </form>
      )}
    </div>
  )
}
