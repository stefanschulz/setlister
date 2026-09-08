import { type Label, type LabelInput, labelInputSchema } from '@setlister/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon, XIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
import { Label as FieldLabel } from '@/components/ui/label'
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
import { useCreateLabel, useDeleteLabel, useLabels, useUpdateLabel } from '@/queries/labels'

type SortColumn = 'name' | 'link' | 'facebookReferenceName'

interface Row {
  label: Label
}

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'link', label: 'Link' },
  { key: 'facebookReferenceName', label: 'Facebook-Referenzname' },
]

function compareRows(a: Row, b: Row, column: SortColumn): number {
  switch (column) {
    case 'name':
      return a.label.name.localeCompare(b.label.name, 'de')
    case 'link':
      return (a.label.link ?? '').localeCompare(b.label.link ?? '', 'de')
    case 'facebookReferenceName':
      return (a.label.facebookReferenceName ?? '').localeCompare(b.label.facebookReferenceName ?? '', 'de')
  }
}

const emptyValues: LabelInput = { name: '', link: undefined, facebookReferenceName: undefined }

function toFormValues(label: Label): LabelInput {
  return {
    name: label.name,
    link: label.link ?? undefined,
    facebookReferenceName: label.facebookReferenceName ?? undefined,
  }
}

export function LabelDialog({
  label,
  initialName,
  open,
  onOpenChange,
  onCreated,
}: {
  label: Label | null
  /** Prefills the name field when creating (ignored when editing). */
  initialName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the created/updated label after a successful submit. */
  onCreated?: (label: Label) => void
}) {
  const createLabel = useCreateLabel()
  const updateLabel = useUpdateLabel()
  const form = useForm<LabelInput>({
    resolver: zodResolver(labelInputSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (open) {
      form.reset(label ? toFormValues(label) : { ...emptyValues, name: initialName ?? '' })
    }
  }, [open, label, initialName, form])

  async function onSubmit(values: LabelInput) {
    try {
      let result: Label
      if (label) {
        result = await updateLabel.mutateAsync({ id: label.id, input: values })
        toast.success(`${values.name} aktualisiert`)
      } else {
        result = await createLabel.mutateAsync(values)
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
          <DialogTitle>{label ? 'Label bearbeiten' : 'Label anlegen'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="link">Link</FieldLabel>
            <Input id="link" {...form.register('link', { setValueAs: emptyToUndefined })} />
            {form.formState.errors.link && (
              <p className="text-xs text-destructive">{form.formState.errors.link.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="facebookReferenceName">Facebook-Referenzname</FieldLabel>
            <Input
              id="facebookReferenceName"
              {...form.register('facebookReferenceName', { setValueAs: emptyToUndefined })}
            />
            {form.formState.errors.facebookReferenceName && (
              <p className="text-xs text-destructive">{form.formState.errors.facebookReferenceName.message}</p>
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

export default function LabelsPage() {
  const { data: labels, isLoading, isError, error } = useLabels()
  const deleteLabel = useDeleteLabel()
  const [dialogLabel, setDialogLabel] = useState<Label | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const [filterName, setFilterName] = useState('')
  const [filterLink, setFilterLink] = useState('')
  const [filterFacebookReferenceName, setFilterFacebookReferenceName] = useState('')
  // Clearing a field (manually or via reset) applies instantly — only new,
  // non-empty text gets debounced.
  const debouncedFilterName = useDebouncedValue(filterName, filterName ? 300 : 0)
  const debouncedFilterLink = useDebouncedValue(filterLink, filterLink ? 300 : 0)
  const debouncedFilterFacebookReferenceName = useDebouncedValue(
    filterFacebookReferenceName,
    filterFacebookReferenceName ? 300 : 0,
  )

  const hasActiveFilters = Boolean(filterName || filterLink || filterFacebookReferenceName)

  function resetFilters() {
    setFilterName('')
    setFilterLink('')
    setFilterFacebookReferenceName('')
  }

  function handleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const rows: Row[] = useMemo(() => (labels ?? []).map((label) => ({ label })), [labels])

  const filteredSorted = useMemo(() => {
    const nameNeedle = debouncedFilterName.trim().toLowerCase()
    const linkNeedle = debouncedFilterLink.trim().toLowerCase()
    const facebookNeedle = debouncedFilterFacebookReferenceName.trim().toLowerCase()

    const filtered = rows.filter(
      (row) =>
        (!nameNeedle || row.label.name.toLowerCase().includes(nameNeedle)) &&
        (!linkNeedle || (row.label.link ?? '').toLowerCase().includes(linkNeedle)) &&
        (!facebookNeedle ||
          (row.label.facebookReferenceName ?? '').toLowerCase().includes(facebookNeedle)),
    )

    const sign = sortDirection === 'asc' ? 1 : -1
    return filtered.sort((a, b) => sign * compareRows(a, b, sortColumn))
  }, [
    rows,
    debouncedFilterName,
    debouncedFilterLink,
    debouncedFilterFacebookReferenceName,
    sortColumn,
    sortDirection,
  ])

  const { pageSize, setPageSize, page, setPage, totalPages, pageItems: pageRows } = usePagination(
    filteredSorted,
    50,
  )

  useEffect(() => {
    setPage(1)
  }, [debouncedFilterName, debouncedFilterLink, debouncedFilterFacebookReferenceName, setPage])

  function openCreate() {
    setDialogLabel(null)
    setDialogOpen(true)
  }

  function openEdit(label: Label) {
    setDialogLabel(label)
    setDialogOpen(true)
  }

  async function onDelete(label: Label) {
    if (!window.confirm(`"${label.name}" wirklich löschen?`)) return
    try {
      await deleteLabel.mutateAsync(label.id)
      toast.success(`${label.name} gelöscht`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unbekannter Fehler')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Labels</h1>
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
        emptyMessage="Noch keine Labels angelegt."
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
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
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
                  value={filterFacebookReferenceName}
                  onChange={(e) => setFilterFacebookReferenceName(e.target.value)}
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
            {pageRows.map(({ label }) => (
              <TableRow key={label.id}>
                <TableCell>{label.name}</TableCell>
                <TableCell>{label.link ?? '–'}</TableCell>
                <TableCell>{label.facebookReferenceName ?? '–'}</TableCell>
                <TableCell className="flex justify-end gap-2 text-right">
                  <Button variant="outline" size="sm" onClick={() => openEdit(label)}>
                    Bearbeiten
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(label)}>
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

      <LabelDialog label={dialogLabel} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
