import { PencilIcon, TrashIcon, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * An icon-only action for a table row's "Aktionen" cell. The label is shown as
 * a tooltip and is the accessible name; pass `to` to render a link instead of a button.
 */
export function RowAction({
  label,
  icon: Icon,
  onClick,
  to,
  destructive,
}: {
  label: string
  icon: LucideIcon
  onClick?: () => void
  to?: string
  destructive?: boolean
}) {
  const className = cn(destructive && 'text-destructive hover:text-destructive')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {to ? (
          <Button variant="ghost" size="icon-sm" className={className} asChild>
            <Link to={to} aria-label={label}>
              <Icon />
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={className}
            aria-label={label}
            onClick={onClick}
          >
            <Icon />
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function EditAction({ onClick }: { onClick: () => void }) {
  return <RowAction label="Bearbeiten" icon={PencilIcon} onClick={onClick} />
}

export function DeleteAction({ onClick }: { onClick: () => void }) {
  return <RowAction label="Löschen" icon={TrashIcon} onClick={onClick} destructive />
}
