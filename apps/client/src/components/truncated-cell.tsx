import { useRef, useState } from 'react'
import { TableCell } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/** Only plain web links become clickable; anything else (relative paths, other schemes) stays text. */
function isWebUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

/**
 * A table cell for long text such as URLs. The column takes whatever width the
 * other columns leave and cuts the rest off with an ellipsis (`w-full max-w-0`
 * is the table-cell ellipsis idiom; `min-w-32` keeps it from collapsing), so it
 * adapts to the window and sidebar without measuring anything. The full text
 * shows as a tooltip, but only while it is actually cut off. With `link`, web
 * URLs open in a new tab.
 */
export function TruncatedCell({
  value,
  link,
  className,
}: {
  value: string | null
  link?: boolean
  className?: string
}) {
  const textRef = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)

  if (!value) return <TableCell className="text-muted-foreground">–</TableCell>

  const textClass = cn('block truncate', className)
  const content =
    link && isWebUrl(value) ? (
      <a
        ref={textRef as React.Ref<HTMLAnchorElement>}
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(textClass, 'underline-offset-2 hover:underline')}
      >
        {value}
      </a>
    ) : (
      <span ref={textRef as React.Ref<HTMLSpanElement>} className={textClass}>
        {value}
      </span>
    )

  return (
    <TableCell className="w-full max-w-0 min-w-32">
      <Tooltip
        open={open}
        onOpenChange={(next) => {
          const el = textRef.current
          setOpen(next && el !== null && el.scrollWidth > el.clientWidth)
        }}
      >
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent className="max-w-md break-words">{value}</TooltipContent>
      </Tooltip>
    </TableCell>
  )
}
