import { type Album, type AlbumInput, albumInputSchema } from '@setlister/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { ListStatus } from '@/components/list-status'
import { PaginationBar } from '@/components/pagination-bar'
import { usePagination } from '@/hooks/use-pagination'
import { emptyToUndefined } from '@/lib/form'
import { useAlbums, useCreateAlbum, useDeleteAlbum, useUpdateAlbum } from '@/queries/albums'

const emptyValues: AlbumInput = { title: '', link: undefined }

function toFormValues(album: Album): AlbumInput {
  return { title: album.title, link: album.link ?? undefined }
}

export function AlbumDialog({
  album,
  open,
  onOpenChange,
  onCreated,
}: {
  album: Album | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the created/updated album after a successful submit. */
  onCreated?: (album: Album) => void
}) {
  const createAlbum = useCreateAlbum()
  const updateAlbum = useUpdateAlbum()
  const form = useForm<AlbumInput>({
    resolver: zodResolver(albumInputSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (open) form.reset(album ? toFormValues(album) : emptyValues)
  }, [open, album, form])

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

export default function AlbumsPage() {
  const { data: albums, isLoading, isError, error } = useAlbums()
  const deleteAlbum = useDeleteAlbum()
  const [dialogAlbum, setDialogAlbum] = useState<Album | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { pageSize, setPageSize, page, setPage, totalPages, pageItems: pageAlbums } = usePagination(
    albums ?? [],
    50,
  )

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
        <Button onClick={openCreate}>
          <PlusIcon /> Neu
        </Button>
      </div>

      <ListStatus
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={(albums?.length ?? 0) === 0}
        emptyMessage="Noch keine Alben angelegt."
      >
        <div className="flex flex-col gap-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Link</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageAlbums.map((album) => (
              <TableRow key={album.id}>
                <TableCell>{album.title}</TableCell>
                <TableCell>{album.link ?? '–'}</TableCell>
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
          totalItems={albums?.length ?? 0}
        />
        </div>
      </ListStatus>

      <AlbumDialog album={dialogAlbum} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
