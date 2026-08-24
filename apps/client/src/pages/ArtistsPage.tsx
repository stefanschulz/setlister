import { type Artist, type ArtistInput, artistInputSchema } from '@setlister/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon, TrashIcon, XIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
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
import { ListStatus } from '@/components/list-status'
import { PaginationBar } from '@/components/pagination-bar'
import { SortableHead, type SortDirection } from '@/components/sortable-table-head'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { usePagination } from '@/hooks/use-pagination'
import { emptyToUndefined } from '@/lib/form'
import { useArtists, useCreateArtist, useDeleteArtist, useUpdateArtist } from '@/queries/artists'
import { useOutputChannels } from '@/queries/output-channels'

type SortColumn = 'name' | 'realName' | 'websiteUrl'

interface Row {
  artist: Artist
}

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'realName', label: 'Realname' },
  { key: 'websiteUrl', label: 'Website' },
]

function compareRows(a: Row, b: Row, column: SortColumn): number {
  switch (column) {
    case 'name':
      return a.artist.name.localeCompare(b.artist.name, 'de')
    case 'realName':
      return (a.artist.realName ?? '').localeCompare(b.artist.realName ?? '', 'de')
    case 'websiteUrl':
      return (a.artist.websiteUrl ?? '').localeCompare(b.artist.websiteUrl ?? '', 'de')
  }
}

const emptyValues: ArtistInput = {
  name: '',
  realName: undefined,
  websiteUrl: undefined,
  socialReferences: [],
}

function toFormValues(artist: Artist): ArtistInput {
  return {
    name: artist.name,
    realName: artist.realName ?? undefined,
    websiteUrl: artist.websiteUrl ?? undefined,
    socialReferences: artist.socialReferences.map((s) => ({
      channelId: s.channelId,
      referenceName: s.referenceName,
    })),
  }
}

export function ArtistDialog({
  artist,
  initialName,
  open,
  onOpenChange,
  onCreated,
}: {
  artist: Artist | null
  /** Prefills the name field when creating (ignored when editing). */
  initialName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the created/updated artist after a successful submit. */
  onCreated?: (artist: Artist) => void
}) {
  const createArtist = useCreateArtist()
  const updateArtist = useUpdateArtist()
  const { data: channels } = useOutputChannels()
  const form = useForm<ArtistInput>({
    resolver: zodResolver(artistInputSchema),
    defaultValues: emptyValues,
  })
  const socialReferences = useFieldArray({ control: form.control, name: 'socialReferences' })

  useEffect(() => {
    if (open) {
      form.reset(artist ? toFormValues(artist) : { ...emptyValues, name: initialName ?? '' })
    }
  }, [open, artist, initialName, form])

  async function onSubmit(values: ArtistInput) {
    try {
      let result: Artist
      if (artist) {
        result = await updateArtist.mutateAsync({ id: artist.id, input: values })
        toast.success(`${values.name} aktualisiert`)
      } else {
        result = await createArtist.mutateAsync(values)
        toast.success(`${values.name} angelegt`)
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
          <DialogTitle>{artist ? 'Künstler bearbeiten' : 'Künstler anlegen'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Künstlername</Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="realName">Realname</Label>
            <Input id="realName" {...form.register('realName', { setValueAs: emptyToUndefined })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="websiteUrl">Website-URL</Label>
            <Input id="websiteUrl" {...form.register('websiteUrl', { setValueAs: emptyToUndefined })} />
            {form.formState.errors.websiteUrl && (
              <p className="text-xs text-destructive">{form.formState.errors.websiteUrl.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Social-Media-Referenzen</Label>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => socialReferences.append({ channelId: 0, referenceName: '' })}
              >
                <PlusIcon />
              </Button>
            </div>
            {socialReferences.fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <Controller
                  control={form.control}
                  name={`socialReferences.${index}.channelId`}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Kanal" />
                      </SelectTrigger>
                      <SelectContent>
                        {channels?.map((channel) => (
                          <SelectItem key={channel.id} value={String(channel.id)}>
                            {channel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Input
                  placeholder="Referenzname"
                  {...form.register(`socialReferences.${index}.referenceName`)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => socialReferences.remove(index)}
                >
                  <TrashIcon />
                </Button>
              </div>
            ))}
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

export default function ArtistsPage() {
  const { data: artists, isLoading, isError, error } = useArtists()
  const deleteArtist = useDeleteArtist()
  const [dialogArtist, setDialogArtist] = useState<Artist | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const [filterName, setFilterName] = useState('')
  const [filterRealName, setFilterRealName] = useState('')
  const [filterWebsiteUrl, setFilterWebsiteUrl] = useState('')
  // Clearing a field (manually or via reset) applies instantly — only new,
  // non-empty text gets debounced.
  const debouncedFilterName = useDebouncedValue(filterName, filterName ? 300 : 0)
  const debouncedFilterRealName = useDebouncedValue(filterRealName, filterRealName ? 300 : 0)
  const debouncedFilterWebsiteUrl = useDebouncedValue(filterWebsiteUrl, filterWebsiteUrl ? 300 : 0)

  const hasActiveFilters = Boolean(filterName || filterRealName || filterWebsiteUrl)

  function resetFilters() {
    setFilterName('')
    setFilterRealName('')
    setFilterWebsiteUrl('')
  }

  function handleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const rows: Row[] = useMemo(() => (artists ?? []).map((artist) => ({ artist })), [artists])

  const filteredSorted = useMemo(() => {
    const nameNeedle = debouncedFilterName.trim().toLowerCase()
    const realNameNeedle = debouncedFilterRealName.trim().toLowerCase()
    const websiteNeedle = debouncedFilterWebsiteUrl.trim().toLowerCase()

    const filtered = rows.filter(
      (row) =>
        (!nameNeedle || row.artist.name.toLowerCase().includes(nameNeedle)) &&
        (!realNameNeedle || (row.artist.realName ?? '').toLowerCase().includes(realNameNeedle)) &&
        (!websiteNeedle || (row.artist.websiteUrl ?? '').toLowerCase().includes(websiteNeedle)),
    )

    const sign = sortDirection === 'asc' ? 1 : -1
    return filtered.sort((a, b) => sign * compareRows(a, b, sortColumn))
  }, [
    rows,
    debouncedFilterName,
    debouncedFilterRealName,
    debouncedFilterWebsiteUrl,
    sortColumn,
    sortDirection,
  ])

  const { pageSize, setPageSize, page, setPage, totalPages, pageItems: pageRows } = usePagination(
    filteredSorted,
    50,
  )

  useEffect(() => {
    setPage(1)
  }, [debouncedFilterName, debouncedFilterRealName, debouncedFilterWebsiteUrl, setPage])

  function openCreate() {
    setDialogArtist(null)
    setDialogOpen(true)
  }

  function openEdit(artist: Artist) {
    setDialogArtist(artist)
    setDialogOpen(true)
  }

  async function onDelete(artist: Artist) {
    if (!window.confirm(`"${artist.name}" wirklich löschen?`)) return
    try {
      await deleteArtist.mutateAsync(artist.id)
      toast.success(`${artist.name} gelöscht`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unbekannter Fehler')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Künstler</h1>
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
        emptyMessage="Noch keine Künstler angelegt."
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
              <TableHead>Social-Referenzen</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
            <TableRow>
              <TableHead>
                <Input
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Filtern…"
                  className="h-8"
                />
              </TableHead>
              <TableHead>
                <Input
                  value={filterRealName}
                  onChange={(e) => setFilterRealName(e.target.value)}
                  placeholder="Filtern…"
                  className="h-8"
                />
              </TableHead>
              <TableHead>
                <Input
                  value={filterWebsiteUrl}
                  onChange={(e) => setFilterWebsiteUrl(e.target.value)}
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
            {pageRows.map(({ artist }) => (
              <TableRow key={artist.id}>
                <TableCell>{artist.name}</TableCell>
                <TableCell>{artist.realName ?? '–'}</TableCell>
                <TableCell>{artist.websiteUrl ?? '–'}</TableCell>
                <TableCell>{artist.socialReferences.length}</TableCell>
                <TableCell className="flex justify-end gap-2 text-right">
                  <Button variant="outline" size="sm" onClick={() => openEdit(artist)}>
                    Bearbeiten
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(artist)}>
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

      <ArtistDialog artist={dialogArtist} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
