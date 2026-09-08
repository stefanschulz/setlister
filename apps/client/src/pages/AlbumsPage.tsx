import { type Album, type AlbumInput, albumInputSchema } from '@setlister/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon, XIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
import { emptyToUndefined } from '@/lib/form'
import { useAlbums, useCreateAlbum, useDeleteAlbum, useUpdateAlbum } from '@/queries/albums'
import { useLabels } from '@/queries/labels'
import { LabelDialog } from './LabelsPage'

type SortColumn = 'title' | 'link' | 'label'

interface Row {
  album: Album
}

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'title', label: 'Titel' },
  { key: 'link', label: 'Link' },
  { key: 'label', label: 'Label' },
]

function compareRows(a: Row, b: Row, column: SortColumn): number {
  switch (column) {
    case 'title':
      return a.album.title.localeCompare(b.album.title, 'de')
    case 'link':
      return (a.album.link ?? '').localeCompare(b.album.link ?? '', 'de')
    case 'label':
      return (a.album.label?.name ?? '').localeCompare(b.album.label?.name ?? '', 'de')
  }
}

const emptyValues: AlbumInput = { title: '', link: undefined, labelId: undefined }

function toFormValues(album: Album): AlbumInput {
  return { title: album.title, link: album.link ?? undefined, labelId: album.labelId ?? undefined }
}

export function AlbumDialog({
  album,
  initialTitle,
  open,
  onOpenChange,
  onCreated,
}: {
  album: Album | null
  /** Prefills the title field when creating (ignored when editing). */
  initialTitle?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the created/updated album after a successful submit. */
  onCreated?: (album: Album) => void
}) {
  const createAlbum = useCreateAlbum()
  const updateAlbum = useUpdateAlbum()
  const { data: labels } = useLabels()
  const form = useForm<AlbumInput>({
    resolver: zodResolver(albumInputSchema),
    defaultValues: emptyValues,
  })

  const [newLabelDialogOpen, setNewLabelDialogOpen] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')

  useEffect(() => {
    if (open) {
      form.reset(album ? toFormValues(album) : { ...emptyValues, title: initialTitle ?? '' })
    }
  }, [open, album, initialTitle, form])

  async function onSubmit(values: AlbumInput) {
    try {
      let result: Album
      if (album) {
        result = await updateAlbum.mutateAsync({ id: album.id, input: values })
        toast.success(`${values.title} aktualisiert`)
      } else {
        result = await createAlbum.mutateAsync(values)
        toast.success(`${values.title} angelegt`)
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{album ? 'Album bearbeiten' : 'Album anlegen'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Albumtitel</Label>
            <Input id="title" {...form.register('title')} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="link">Albumlink</Label>
            <Input id="link" {...form.register('link', { setValueAs: emptyToUndefined })} />
            {form.formState.errors.link && (
              <p className="text-xs text-destructive">{form.formState.errors.link.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Label</Label>
            <Controller
              control={form.control}
              name="labelId"
              render={({ field }) => (
                <EntityCombobox
                  items={(labels ?? []).map((label) => ({
                    id: label.id,
                    label: label.name,
                    sublabel: label.link ?? undefined,
                  }))}
                  value={field.value || undefined}
                  onChange={field.onChange}
                  // null, not undefined: react-hook-form's Controller falls back to the
                  // field's last non-undefined default value if set to undefined outside
                  // of a full form reset. null is treated as a real value and clears it;
                  // albumInputSchema accepts null directly (labelId is .nullable()), and
                  // the server normalizes it to a NULL column on write.
                  onClear={() => field.onChange(null)}
                  placeholder="Label wählen (optional)"
                  onCreateNew={(search) => {
                    setNewLabelName(search)
                    setNewLabelDialogOpen(true)
                  }}
                  createNewLabel="Neues Label anlegen…"
                />
              )}
            />
            {form.formState.errors.labelId && (
              <p className="text-xs text-destructive">{form.formState.errors.labelId.message}</p>
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

    <LabelDialog
      label={null}
      initialName={newLabelName}
      open={newLabelDialogOpen}
      onOpenChange={setNewLabelDialogOpen}
      onCreated={(newLabel) => form.setValue('labelId', newLabel.id)}
    />
    </>
  )
}

export default function AlbumsPage() {
  const { data: albums, isLoading, isError, error } = useAlbums()
  const deleteAlbum = useDeleteAlbum()
  const [dialogAlbum, setDialogAlbum] = useState<Album | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [sortColumn, setSortColumn] = useState<SortColumn>('title')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const [filterTitle, setFilterTitle] = useState('')
  const [filterLink, setFilterLink] = useState('')
  const [filterLabel, setFilterLabel] = useState('')
  // Clearing a field (manually or via reset) applies instantly — only new,
  // non-empty text gets debounced.
  const debouncedFilterTitle = useDebouncedValue(filterTitle, filterTitle ? 300 : 0)
  const debouncedFilterLink = useDebouncedValue(filterLink, filterLink ? 300 : 0)
  const debouncedFilterLabel = useDebouncedValue(filterLabel, filterLabel ? 300 : 0)

  const hasActiveFilters = Boolean(filterTitle || filterLink || filterLabel)

  function resetFilters() {
    setFilterTitle('')
    setFilterLink('')
    setFilterLabel('')
  }

  function handleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const rows: Row[] = useMemo(() => (albums ?? []).map((album) => ({ album })), [albums])

  const filteredSorted = useMemo(() => {
    const titleNeedle = debouncedFilterTitle.trim().toLowerCase()
    const linkNeedle = debouncedFilterLink.trim().toLowerCase()
    const labelNeedle = debouncedFilterLabel.trim().toLowerCase()

    const filtered = rows.filter(
      (row) =>
        (!titleNeedle || row.album.title.toLowerCase().includes(titleNeedle)) &&
        (!linkNeedle || (row.album.link ?? '').toLowerCase().includes(linkNeedle)) &&
        (!labelNeedle || (row.album.label?.name ?? '').toLowerCase().includes(labelNeedle)),
    )

    const sign = sortDirection === 'asc' ? 1 : -1
    return filtered.sort((a, b) => sign * compareRows(a, b, sortColumn))
  }, [rows, debouncedFilterTitle, debouncedFilterLink, debouncedFilterLabel, sortColumn, sortDirection])

  const { pageSize, setPageSize, page, setPage, totalPages, pageItems: pageRows } = usePagination(
    filteredSorted,
    50,
  )

  useEffect(() => {
    setPage(1)
  }, [debouncedFilterTitle, debouncedFilterLink, debouncedFilterLabel, setPage])

  function openCreate() {
    setDialogAlbum(null)
    setDialogOpen(true)
  }

  function openEdit(album: Album) {
    setDialogAlbum(album)
    setDialogOpen(true)
  }

  async function onDelete(album: Album) {
    if (!window.confirm(`"${album.title}" wirklich löschen?`)) return
    try {
      await deleteAlbum.mutateAsync(album.id)
      toast.success(`${album.title} gelöscht`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unbekannter Fehler')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Alben</h1>
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
        emptyMessage="Noch keine Alben angelegt."
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
                  value={filterLink}
                  onChange={(e) => setFilterLink(e.target.value)}
                  placeholder="Filtern…"
                  className="h-8"
                />
              </TableHead>
              <TableHead>
                <Input
                  value={filterLabel}
                  onChange={(e) => setFilterLabel(e.target.value)}
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
            {pageRows.map(({ album }) => (
              <TableRow key={album.id}>
                <TableCell>{album.title}</TableCell>
                <TableCell>{album.link ?? '–'}</TableCell>
                <TableCell>{album.label?.name ?? '–'}</TableCell>
                <TableCell className="flex justify-end gap-2 text-right">
                  <Button variant="outline" size="sm" onClick={() => openEdit(album)}>
                    Bearbeiten
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(album)}>
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

      <AlbumDialog album={dialogAlbum} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
