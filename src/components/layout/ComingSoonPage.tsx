import { Construction } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

/** Placeholder for modules scheduled in later phases. */
export default function ComingSoonPage({ title, phase }: { title: string; phase?: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Construction className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Módulo em construção</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {phase ? `Previsto para a ${phase} do roadmap.` : 'Em breve nesta plataforma.'} A estrutura de dados já está pronta no banco.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
