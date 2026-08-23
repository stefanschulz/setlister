import { AlertTriangleIcon, DownloadIcon, UploadIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRestoreBackup } from '@/queries/backup'

const CONFIRM_PHRASE = 'ERSETZEN'

/** e.g. 20260823-1955, using the client's local time (the server may run in a different timezone). */
function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`
}

export default function BackupPage() {
  const navigate = useNavigate()
  const restoreBackup = useRestoreBackup()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    setIsExporting(true)
    try {
      const res = await fetch('/api/backup')
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `setlister-backup-${formatTimestamp(new Date())}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Backup konnte nicht heruntergeladen werden')
    } finally {
      setIsExporting(false)
    }
  }

  function openConfirm() {
    if (!selectedFile) return
    setConfirmText('')
    setConfirmOpen(true)
  }

  async function handleRestore() {
    if (!selectedFile) return
    let parsed: unknown
    try {
      parsed = JSON.parse(await selectedFile.text())
    } catch {
      toast.error('Datei ist kein gültiges JSON')
      return
    }

    try {
      await restoreBackup.mutateAsync(parsed)
      toast.success('Daten wiederhergestellt')
      setConfirmOpen(false)
      setSelectedFile(null)
      navigate('/')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unbekannter Fehler')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Backup</h1>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="font-medium">Export</h2>
        <p className="text-sm text-muted-foreground">
          Lädt eine JSON-Datei mit dem vollständigen aktuellen Datenbestand herunter – zur
          Datensicherung oder als Grundlage für eine spätere Wiederherstellung.
        </p>
        <Button variant="outline" className="self-start" onClick={handleExport} disabled={isExporting}>
          <DownloadIcon /> Backup herunterladen
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 p-4">
        <h2 className="font-medium">Import (Wiederherstellen)</h2>
        <p className="text-sm text-muted-foreground">
          Ersetzt <strong>alle</strong> aktuellen Daten vollständig durch den Inhalt der
          ausgewählten Backup-Datei. Dies kann nicht rückgängig gemacht werden.
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept="application/json,.json"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="max-w-sm"
          />
          <Button variant="destructive" disabled={!selectedFile} onClick={openConfirm}>
            <UploadIcon /> Wiederherstellen…
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="text-destructive" /> Alle Daten ersetzen?
            </DialogTitle>
            <DialogDescription>
              Diese Aktion löscht sämtliche Episoden, Tracks, Künstler, Alben und Ausgabekanäle
              unwiderruflich und ersetzt sie durch den Inhalt von{' '}
              <strong>{selectedFile?.name}</strong>. Tippe {CONFIRM_PHRASE}, um zu bestätigen.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-restore">Bestätigung</Label>
            <Input
              id="confirm-restore"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={confirmText !== CONFIRM_PHRASE || restoreBackup.isPending}
              onClick={handleRestore}
            >
              Unwiderruflich ersetzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
