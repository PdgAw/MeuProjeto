import { FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fmtBytes, openStoredFile, signedUrl, type StoredFile } from '@/lib/storage'

export function Attachment({ file, mine }: { file: StoredFile; mine: boolean }) {
  const [url, setUrl] = useState<string | null>(null)
  const isImage = file.mime?.startsWith('image/')
  useEffect(() => { if (isImage) signedUrl('chat', file.path).then(setUrl).catch(() => setUrl(null)) }, [file.path, isImage])
  if (isImage) {
    return url ? <button onClick={() => window.open(url, '_blank', 'noopener')}><img src={url} alt={file.name} className="max-h-56 rounded-lg object-cover" /></button>
      : <div className="h-32 w-48 animate-pulse rounded-lg bg-black/10" />
  }
  return (
    <button onClick={() => void openStoredFile('chat', file.path).catch((e) => toast.error(e.message))}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${mine ? 'bg-white/15' : 'bg-secondary'}`}>
      <FileText className="h-5 w-5 shrink-0" /><span className="min-w-0"><span className="block truncate font-medium">{file.name}</span><span className="text-xs opacity-70">{fmtBytes(file.size)}</span></span>
    </button>
  )
}
