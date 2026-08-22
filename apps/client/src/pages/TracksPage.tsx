import {
  CONTRIBUTOR_ROLES,
  type ContributorRole,
  type Track,
  type TrackInput,
  trackContributorInputSchema,
} from '@setlister/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ApiError } from '@/api/client'
import { EntityCombobox } from '@/components/entity-combobox'
import { ListStatus } from '@/components/list-status'
import { useAlbums } from '@/queries/albums'
import { useArtists } from '@/queries/artists'
import { useCreateTrack, useDeleteTrack, useTracks, useUpdateTrack } from '@/queries/tracks'
import { ArtistDialog } from './ArtistsPage'

const ROLE_LABELS: Record<ContributorRole, string> = {
  ORIGINAL: 'Original',
  FEATURING: 'Feat.',
  REMIX: 'Remix',
}

// The position within a role group is derived from row order, not user input.
const trackFormSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  albumId: z.number().int().positive({ message: 'Album ist erforderlich' }),
  contributors: z
    .array(trackContributorInputSchema.omit({ position: true }))
    .min(1, 'Mindestens ein Künstler erforderlich'),
})
type TrackFormValues = z.infer<typeof trackFormSchema>

const emptyValues: TrackFormValues = { title: '', albumId: 0, contributors: [] }

function toFormValues(track: Track): TrackFormValues {
  return {
    title: track.title,
    albumId: track.albumId,
    contributors: track.contributors.map((c) => ({ artistId: c.artist.id, role: c.role })),
  }
}

function withPositions(contributors: TrackFormValues['contributors']): TrackInput['contributors'] {
  const counters: Record<ContributorRole, number> = { ORIGINAL: 0, FEATURING: 0, REMIX: 0 }
  return contributors.map((c) => ({ ...c, position: counters[c.role]++ }))
}

export function TrackDialog({
  track,
  open,
  onOpenChange,
  onCreated,
}: {
  track: Track | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the created/updated track after a successful submit. */
  onCreated?: (track: Track) => void
}) {
  const { data: albums } = useAlbums()
  const { data: artists } = useArtists()
  const createTrack = useCreateTrack()
  const updateTrack = useUpdateTrack()
  const form = useForm<TrackFormValues>({
    resolver: zodResolver(trackFormSchema),
    defaultValues: emptyValues,
  })
  const contributors = useFieldArray({ control: form.control, name: 'contributors' })

  const [newArtistIndex, setNewArtistIndex] = useState<number | null>(null)

  useEffect(() => {
    if (open) form.reset(track ? toFormValues(track) : emptyValues)
  }, [open, track, form])

  async function onSubmit(values: TrackFormValues) {
    const input: TrackInput = { ...values, contributors: withPositions(values.contributors) }
    try {
      let result: Track
      if (track) {
        result = await updateTrack.mutateAsync({ id: track.id, input })
        toast.success(`${input.title} aktualisiert`)
      } else {
        result = await createTrack.mutateAsync(input)
        toast.success(`${input.title} angelegt`)
      }
      onOpenChange(false)
      onCreated?.(result)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unbekannter Fehler')
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{track ? 'Track bearbeiten' : 'Track anlegen'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Tracktitel</Label>
            <Input id="title" {...form.register('title')} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Album</Label>
            <Controller
              control={form.control}
              name="albumId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Album wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {albums?.map((album) => (
                      <SelectItem key={album.id} value={String(album.id)}>
                        {album.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.albumId && (
              <p className="text-xs text-destructive">{form.formState.errors.albumId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Künstler</Label>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => contributors.append({ artistId: 0, role: 'ORIGINAL' })}
              >
                <PlusIcon />
              </Button>
            </div>
            {contributors.fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <Controller
                  control={form.control}
                  name={`contributors.${index}.artistId`}
                  render={({ field }) => (
                    <EntityCombobox
                      items={(artists ?? []).map((artist) => ({ id: artist.id, label: artist.name }))}
                      value={field.value || undefined}
                      onChange={field.onChange}
                      placeholder="Künstler"
                      onCreateNew={() => setNewArtistIndex(index)}
                      createNewLabel="Neuen Künstler anlegen…"
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name={`contributors.${index}.role`}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTRIBUTOR_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => contributors.remove(index)}
                >
                  <TrashIcon />
                </Button>
              </div>
            ))}
            {form.formState.errors.contributors && (
              <p className="text-xs text-destructive">
                {form.formState.errors.contributors.message ??
                  form.formState.errors.contributors.root?.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <ArtistDialog
      artist={null}
      open={newArtistIndex !== null}
      onOpenChange={(o) => {
        if (!o) setNewArtistIndex(null)
      }}
      onCreated={(newArtist) => {
        if (newArtistIndex !== null) {
          form.setValue(`contributors.${newArtistIndex}.artistId`, newArtist.id)
        }
        setNewArtistIndex(null)
      }}
    />
    </>
  )
}

export default function TracksPage() {
  const { data: tracks, isLoading, isError, error } = useTracks()
  const deleteTrack = useDeleteTrack()
  const [dialogTrack, setDialogTrack] = useState<Track | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  function openCreate() {
    setDialogTrack(null)
    setDialogOpen(true)
  }

  function openEdit(track: Track) {
    setDialogTrack(track)
    setDialogOpen(true)
  }

  async function onDelete(track: Track) {
    if (!window.confirm(`"${track.title}" wirklich löschen?`)) return
    try {
      await deleteTrack.mutateAsync(track.id)
      toast.success(`${track.title} gelöscht`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unbekannter Fehler')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Tracks</h1>
        <Button onClick={openCreate}>
          <PlusIcon /> Neu
        </Button>
      </div>

      <ListStatus
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={(tracks?.length ?? 0) === 0}
        emptyMessage="Noch keine Tracks angelegt."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Album</TableHead>
              <TableHead>Künstler</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tracks?.map((track) => (
              <TableRow key={track.id}>
                <TableCell>{track.title}</TableCell>
                <TableCell>{track.album.title}</TableCell>
                <TableCell>
                  {track.contributors
                    .map((c) => `${c.artist.name} (${ROLE_LABELS[c.role]})`)
                    .join(', ')}
                </TableCell>
                <TableCell className="flex justify-end gap-2 text-right">
                  <Button variant="outline" size="sm" onClick={() => openEdit(track)}>
                    Bearbeiten
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(track)}>
                    Löschen
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListStatus>

      <TrackDialog track={dialogTrack} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
