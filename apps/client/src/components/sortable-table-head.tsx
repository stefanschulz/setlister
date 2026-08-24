import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type SortDirection = 'asc' | 'desc'

export function SortableHead<T extends string>({
  column,
  label,
  sortColumn,
  sortDirection,
  onSort,
}: {
  column: T
  label: string
  sortColumn: T
  sortDirection: SortDirection
  onSort: (column: T) => void
}) {
  const isActive = column === sortColumn
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          'inline-flex items-center gap-1 font-medium hover:text-foreground',
          !isActive && 'text-muted-foreground',
        )}
      >
        {label}
        {isActive &&
          (sortDirection === 'asc' ? (
            <ArrowUpIcon className="size-3.5" />
          ) : (
            <ArrowDownIcon className="size-3.5" />
          ))}
      </button>
    </TableHead>
  )
}
