import {
  compareEpisodeNumbers,
  type Episode,
  type EpisodeInput,
  episodeInputSchema,
  formatEpisodeNumber,
} from '@setlister/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { ListMusicIcon, PlusIcon, XIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
import { PaginationBar } from '@/components/pagination-bar'
import { SortableHead, type SortDirection } from '@/components/sortable-table-head'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { usePagination } from '@/hooks/use-pagination'
import { emptyToUndefined } from '@/lib/form'
import {
  useCreateEpisode,
  useDeleteEpisode,
  useEpisodes,
  useUpdateEpisode,
} from '@/queries/episodes'

type SortColumn = 'number' | 'headline' | 'topic'

interface Row {
  episode: Episode
  numberDisplay: string
}

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'number', label: 'Nr.' },
  { key: 'headline', label: 'Schlagzeile' },
  { key: 'topic', label: 'Thema' },
]

function compareRows(a: Row, b: Row, column: SortColumn): number {
  switch (column) {
    case 'number':
      return compareEpisodeNumbers(a.episode, b.episode)
    case 'headline':
      return a.episode.headline.localeCompare(b.episode.headline, 'de')
    case 'topic':
      return a.episode.topic.localeCompare(b.episode.topic, 'de')
  }
}

const emptyValues: EpisodeInput = { number: 0, suffix: '', headline: '', topic: '', airDate: undefined }

function toFormValues(episode: Episode): EpisodeInput {
  return {
    number: episode.number,
    suffix: episode.suffix,
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
        toast.success(`Episode ${formatEpisodeNumber({ number: values.number, suffix: values.suffix ?? '' })} aktualisiert`)
      } else {
        result = await createEpisode.mutateAsync(values)
        toast.success(`Episode ${formatEpisodeNumber({ number: values.number, suffix: values.suffix ?? '' })} angelegt`)
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
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="number">Ausgabennummer</Label>
              <Input id="number" type="number" {...form.register('number', { valueAsNumber: true })} />
              {form.formState.errors.number && (
                <p className="text-xs text-destructive">{form.formState.errors.number.message}</p>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="suffix">Zusatz (optional)</Label>
              <Input id="suffix" placeholder="z. B. v1, (xe)" {...form.register('suffix')} />
              {form.formState.errors.suffix && (
                <p className="text-xs text-destructive">{form.formState.errors.suffix.message}</p>
              )}
            </div>
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

  const [sortColumn, setSortColumn] = useState<SortColumn>('number')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const [filterNumber, setFilterNumber] = useState('')
  const [filterHeadline, setFilterHeadline] = useState('')
  const [filterTopic, setFilterTopic] = useState('')
  // Clearing a field (manually or via reset) applies instantly — only new,
  // non-empty text gets debounced.
  const debouncedFilterNumber = useDebouncedValue(filterNumber, filterNumber ? 300 : 0)
  const debouncedFilterHeadline = useDebouncedValue(filterHeadline, filterHeadline ? 300 : 0)
  const debouncedFilterTopic = useDebouncedValue(filterTopic, filterTopic ? 300 : 0)

  const hasActiveFilters = Boolean(filterNumber || filterHeadline || filterTopic)

  function resetFilters() {
    setFilterNumber('')
    setFilterHeadline('')
    setFilterTopic('')
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
      (episodes ?? []).map((episode) => ({
        episode,
        numberDisplay: formatEpisodeNumber(episode),
      })),
    [episodes],
  )

  const filteredSorted = useMemo(() => {
    const numberNeedle = debouncedFilterNumber.trim().toLowerCase()
    const headlineNeedle = debouncedFilterHeadline.trim().toLowerCase()
    const topicNeedle = debouncedFilterTopic.trim().toLowerCase()

    const filtered = rows.filter(
      (row) =>
        (!numberNeedle || row.numberDisplay.toLowerCase().includes(numberNeedle)) &&
        (!headlineNeedle || row.episode.headline.toLowerCase().includes(headlineNeedle)) &&
        (!topicNeedle || row.episode.topic.toLowerCase().includes(topicNeedle)),
    )

    const sign = sortDirection === 'asc' ? 1 : -1
    return filtered.sort((a, b) => sign * compareRows(a, b, sortColumn))
  }, [rows, debouncedFilterNumber, debouncedFilterHeadline, debouncedFilterTopic, sortColumn, sortDirection])

  const { pageSize, setPageSize, page, setPage, totalPages, pageItems: pageRows } = usePagination(
    filteredSorted,
    50,
  )

  useEffect(() => {
    setPage(1)
  }, [debouncedFilterNumber, debouncedFilterHeadline, debouncedFilterTopic, setPage])

  function openCreate() {
    setDialogEpisode(null)
    setDialogOpen(true)
  }

  function openEdit(episode: Episode) {
    setDialogEpisode(episode)
    setDialogOpen(true)
  }

  async function onDelete(episode: Episode) {
    if (!window.confirm(`Episode ${formatEpisodeNumber(episode)} wirklich löschen?`)) return
    try {
      await deleteEpisode.mutateAsync(episode.id)
      toast.success(`Episode ${formatEpisodeNumber(episode)} gelöscht`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unbekannter Fehler')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Episoden</h1>
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
        emptyMessage="Noch keine Episoden angelegt."
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
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
            <TableRow>
              <TableHead>
                <Input
                  value={filterNumber}
                  onChange={(e) => setFilterNumber(e.target.value)}
                  placeholder="Filtern…"
                  className="h-8"
                />
              </TableHead>
              <TableHead>
                <Input
                  value={filterHeadline}
                  onChange={(e) => setFilterHeadline(e.target.value)}
                  placeholder="Filtern…"
                  className="h-8"
                />
              </TableHead>
              <TableHead>
                <Input
                  value={filterTopic}
                  onChange={(e) => setFilterTopic(e.target.value)}
                  placeholder="Filtern…"
                  className="h-8"
                />
              </TableHead>
              <TableHead />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Keine Treffer für die aktuellen Filter.
                </TableCell>
              </TableRow>
            )}
            {pageRows.map(({ episode, numberDisplay }) => (
              <TableRow key={episode.id}>
                <TableCell>{numberDisplay}</TableCell>
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

      <EpisodeDialog episode={dialogEpisode} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
