import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PAGE_SIZE_OPTIONS, type PageSize } from '@/hooks/use-pagination'

export function PaginationBar({
  pageSize,
  onPageSizeChange,
  page,
  totalPages,
  onPageChange,
  totalItems,
}: {
  pageSize: PageSize
  onPageSizeChange: (size: PageSize) => void
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
}) {
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>Einträge pro Seite</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(v === 'all' ? 'all' : (Number(v) as PageSize))}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={String(size)} value={String(size)}>
                {size === 'all' ? 'Alle' : size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <span>
          {totalItems === 0 ? '0 Einträge' : `Seite ${page} von ${totalPages} (${totalItems} Einträge)`}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded-md border p-1 disabled:opacity-40"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="rounded-md border p-1 disabled:opacity-40"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
