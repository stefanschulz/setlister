import { type Episode, type EpisodeInput, episodeInputSchema } from '@setlister/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { ListMusicIcon, PlusIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ApiError } from '@/api/client'
import { ListStatus } from '@/components/list-status'
import { emptyToUndefined } from '@/lib/form'
import {
  useCreateEpisode,
  useDeleteEpisode,
  useEpisodes,
  useUpdateEpisode,
} from '@/queries/episodes'

const emptyValues: EpisodeInput = { number: 0, headline: '', topic: '', airDate: undefined }

function toFormValues(episode: Episode): EpisodeInput {
  return {
    number: episode.number,
    headline: episode.headline,
    topic: episode.topic,
    airDate: episode.airDate ?? undefined,
  }
}

export function EpisodeDialog({
  episode,
  open,
  onOpenChange,
  onCreated,
}: {
  episode: Episode | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the created/updated episode after a successful submit. */
  onCreated?: (episode: Episode) => void
}) {
  const createEpisode = useCreateEpisode()
  const updateEpisode = useUpdateEpisode()
  const form = useForm<EpisodeInput>({
    resolver: zodResolver(episodeInputSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (open) form.reset(episode ? toFormValues(episode) : emptyValues)
  }, [open, episode, form])

  async function onSubmit(values: EpisodeInput) {
    try {
      let result: Episode
      if (episode) {
        result = await updateEpisode.mutateAsync({ id: episode.id, input: values })
        toast.success(`Episode ${values.number} aktualisiert`)
      } else {
        result = await createEpisode.mutateAsync(values)
        toast.success(`Episode ${values.number} angelegt`)
      }
      onOpenChange(false)
      onCreated?.(result)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unbekannter Fehler')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{episode ? 'Episode bearbeiten' : 'Episode anlegen'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="number">Ausgabennummer</Label>
            <Input id="number" type="number" {...form.register('number', { valueAsNumber: true })} />
            {form.formState.errors.number && (
              <p className="text-xs text-destructive">{form.formState.errors.number.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="headline">Schlagzeile</Label>
            <Input id="headline" {...form.register('headline')} />
            {form.formState.errors.headline && (
              <p className="text-xs text-destructive">{form.formState.errors.headline.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="topic">Thema</Label>
            <Input id="topic" {...form.register('topic')} />
            {form.formState.errors.topic && (
              <p className="text-xs text-destructive">{form.formState.errors.topic.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="airDate">Sendedatum (leer = Entwurf)</Label>
            <Input
              id="airDate"
              type="date"
              {...form.register('airDate', { setValueAs: emptyToUndefined })}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function EpisodesPage() {
  const { data: episodes, isLoading, isError, error } = useEpisodes()
  const deleteEpisode = useDeleteEpisode()
  const [dialogEpisode, setDialogEpisode] = useState<Episode | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  function openCreate() {
    setDialogEpisode(null)
    setDialogOpen(true)
  }

  function openEdit(episode: Episode) {
    setDialogEpisode(episode)
    setDialogOpen(true)
  }

  async function onDelete(episode: Episode) {
    if (!window.confirm(`Episode ${episode.number} wirklich löschen?`)) return
    try {
      await deleteEpisode.mutateAsync(episode.id)
      toast.success(`Episode ${episode.number} gelöscht`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unbekannter Fehler')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Episoden</h1>
        <Button onClick={openCreate}>
          <PlusIcon /> Neu
        </Button>
      </div>

      <ListStatus
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={(episodes?.length ?? 0) === 0}
        emptyMessage="Noch keine Episoden angelegt."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nr.</TableHead>
              <TableHead>Schlagzeile</TableHead>
              <TableHead>Thema</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {episodes?.map((episode) => (
              <TableRow key={episode.id}>
                <TableCell>{episode.number}</TableCell>
                <TableCell>{episode.headline}</TableCell>
                <TableCell>{episode.topic}</TableCell>
                <TableCell>
                  <Badge variant={episode.published ? 'default' : 'secondary'}>
                    {episode.published ? `Veröffentlicht (${episode.airDate})` : 'Entwurf'}
                  </Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-2 text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/episodes/${episode.id}`}>
                      <ListMusicIcon /> Playlist
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(episode)}>
                    Bearbeiten
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(episode)}>
                    Löschen
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListStatus>

      <EpisodeDialog episode={dialogEpisode} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
