import {
  CONTRIBUTOR_ROLES,
  type ContributorRole,
  type Track,
  type TrackInput,
  trackContributorInputSchema,
} from '@setlister/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon, TrashIcon, XIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
import { PaginationBar } from '@/components/pagination-bar'
import { SortableHead, type SortDirection } from '@/components/sortable-table-head'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { usePagination } from '@/hooks/use-pagination'
import { useAlbums } from '@/queries/albums'
import { useArtists } from '@/queries/artists'
import { useCreateTrack, useDeleteTrack, useTracks, useUpdateTrack } from '@/queries/tracks'
import { AlbumDialog } from './AlbumsPage'
import { ArtistDialog } from './ArtistsPage'

const ROLE_LABELS: Record<ContributorRole, string> = {
  ORIGINAL: 'Original',
  FEATURING: 'Feat.',
  REMIX: 'Remix',
}

type SortColumn = 'title' | 'album' | 'contributors'

interface Row {
  track: Track
  contributorsText: string
}

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'title', label: 'Titel' },
  { key: 'album', label: 'Album' },
  { key: 'contributors', label: 'Künstler' },
]

function compareRows(a: Row, b: Row, column: SortColumn): number {
  switch (column) {
    case 'title':
      return a.track.title.localeCompare(b.track.title, 'de')
    case 'album':
      return a.track.album.title.localeCompare(b.track.album.title, 'de')
    case 'contributors':
      return a.contributorsText.localeCompare(b.contributorsText, 'de')
  }
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
  initialTitle,
  open,
  onOpenChange,
  onCreated,
}: {
  track: Track | null
  /** Prefills the title field when creating (ignored when editing). */
  initialTitle?: string
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
  const [newArtistName, setNewArtistName] = useState('')
  const [newAlbumDialogOpen, setNewAlbumDialogOpen] = useState(false)
  const [newAlbumTitle, setNewAlbumTitle] = useState('')

  useEffect(() => {
    if (open) {
      form.reset(track ? toFormValues(track) : { ...emptyValues, title: initialTitle ?? '' })
    }
  }, [open, track, initialTitle, form])

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
                <EntityCombobox
                  items={(albums ?? []).map((album) => ({ id: album.id, label: album.title }))}
                  value={field.value || undefined}
                  onChange={field.onChange}
                  placeholder="Album wählen"
                  onCreateNew={(search) => {
                    setNewAlbumTitle(search)
                    setNewAlbumDialogOpen(true)
                  }}
                  createNewLabel="Neues Album anlegen…"
                />
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
              <div key={field.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Controller
                    control={form.control}
                    name={`contributors.${index}.artistId`}
                    render={({ field }) => (
                      <EntityCombobox
                        items={(artists ?? []).map((artist) => ({ id: artist.id, label: artist.name }))}
                        value={field.value || undefined}
                        onChange={field.onChange}
                        placeholder="Künstler"
                        onCreateNew={(search) => {
                          setNewArtistName(search)
                          setNewArtistIndex(index)
                        }}
                        createNewLabel="Neuen Künstler anlegen…"
                      />
                    )}
                  />
                </div>
                <Controller
                  control={form.control}
                  name={`contributors.${index}.role`}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-36 shrink-0">
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

    <AlbumDialog
      album={null}
      initialTitle={newAlbumTitle}
      open={newAlbumDialogOpen}
      onOpenChange={setNewAlbumDialogOpen}
      onCreated={(newAlbum) => form.setValue('albumId', newAlbum.id)}
    />

    <ArtistDialog
      artist={null}
      initialName={newArtistName}
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

  const [sortColumn, setSortColumn] = useState<SortColumn>('title')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const [filterTitle, setFilterTitle] = useState('')
  const [filterAlbum, setFilterAlbum] = useState('')
  const [filterContributors, setFilterContributors] = useState('')
  // Clearing a field (manually or via reset) applies instantly — only new,
  // non-empty text gets debounced.
  const debouncedFilterTitle = useDebouncedValue(filterTitle, filterTitle ? 300 : 0)
  const debouncedFilterAlbum = useDebouncedValue(filterAlbum, filterAlbum ? 300 : 0)
  const debouncedFilterContributors = useDebouncedValue(filterContributors, filterContributors ? 300 : 0)

  const hasActiveFilters = Boolean(filterTitle || filterAlbum || filterContributors)

  function resetFilters() {
    setFilterTitle('')
    setFilterAlbum('')
    setFilterContributors('')
  }

  function handleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const rows: Row[] = useMemo(
    () =>
      (tracks ?? []).map((track) => ({
        track,
        contributorsText: track.contributors
          .map((c) => `${c.artist.name} (${ROLE_LABELS[c.role]})`)
          .join(', '),
      })),
    [tracks],
  )

  const filteredSorted = useMemo(() => {
    const titleNeedle = debouncedFilterTitle.trim().toLowerCase()
    const albumNeedle = debouncedFilterAlbum.trim().toLowerCase()
    const contributorsNeedle = debouncedFilterContributors.trim().toLowerCase()

    const filtered = rows.filter(
      (row) =>
        (!titleNeedle || row.track.title.toLowerCase().includes(titleNeedle)) &&
        (!albumNeedle || row.track.album.title.toLowerCase().includes(albumNeedle)) &&
        (!contributorsNeedle || row.contributorsText.toLowerCase().includes(contributorsNeedle)),
    )

    const sign = sortDirection === 'asc' ? 1 : -1
    return filtered.sort((a, b) => sign * compareRows(a, b, sortColumn))
  }, [
    rows,
    debouncedFilterTitle,
    debouncedFilterAlbum,
    debouncedFilterContributors,
    sortColumn,
    sortDirection,
  ])

  const { pageSize, setPageSize, page, setPage, totalPages, pageItems: pageRows } = usePagination(
    filteredSorted,
    50,
  )

  useEffect(() => {
    setPage(1)
  }, [debouncedFilterTitle, debouncedFilterAlbum, debouncedFilterContributors, setPage])

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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetFilters} disabled={!hasActiveFilters}>
            <XIcon /> Filter zurücksetzen
          </Button>
          <Button onClick={openCreate}>
            <PlusIcon /> Neu
          </Button>
        </div>
      </div>

      <ListStatus
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage="Noch keine Tracks angelegt."
      >
        <div className="flex flex-col gap-3">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((col) => (
                <SortableHead
                  key={col.key}
                  column={col.key}
                  label={col.label}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              ))}
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
            <TableRow>
              <TableHead>
                <Input
                  value={filterTitle}
                  onChange={(e) => setFilterTitle(e.target.value)}
                  placeholder="Filtern…"
                  className="h-8"
                />
              </TableHead>
              <TableHead>
                <Input
                  value={filterAlbum}
                  onChange={(e) => setFilterAlbum(e.target.value)}
                  placeholder="Filtern…"
                  className="h-8"
                />
              </TableHead>
              <TableHead>
                <Input
                  value={filterContributors}
                  onChange={(e) => setFilterContributors(e.target.value)}
                  placeholder="Filtern…"
                  className="h-8"
                />
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Keine Treffer für die aktuellen Filter.
                </TableCell>
              </TableRow>
            )}
            {pageRows.map(({ track, contributorsText }) => (
              <TableRow key={track.id}>
                <TableCell>{track.title}</TableCell>
                <TableCell>{track.album.title}</TableCell>
                <TableCell>{contributorsText}</TableCell>
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

        <PaginationBar
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={filteredSorted.length}
        />
        </div>
      </ListStatus>

      <TrackDialog track={dialogTrack} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
