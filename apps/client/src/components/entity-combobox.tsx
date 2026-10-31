import { CheckIcon, ChevronsUpDownIcon, PlusIcon, XIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { filterComboboxItems } from '@/lib/combobox-filter'
import { cn } from '@/lib/utils'

export interface ComboboxItem {
  id: number
  label: string
  /** Shown as smaller, muted text below the label — e.g. a link, to help disambiguate same-titled entries. */
  sublabel?: string
}

/** How many matches the list renders at once; the rest is summarized as "N weitere". */
const MAX_VISIBLE_ITEMS = 50

/**
 * Searchable replacement for a plain <Select> once a list can realistically
 * grow past a few dozen entries (tracks, artists) — type-to-filter instead of
 * scrolling a long dropdown. Optionally offers a "+ create new" row, pinned to
 * the bottom of the popup so it is always in reach, that hands off to the
 * caller (e.g. to open that entity's own create dialog) rather than creating
 * anything itself.
 */
export function EntityCombobox({
  items,
  value,
  onChange,
  placeholder,
  searchPlaceholder = 'Suchen…',
  emptyText = 'Keine Treffer.',
  onCreateNew,
  createNewLabel = 'Neu anlegen…',
  onClear,
}: {
  items: ComboboxItem[]
  value: number | undefined
  onChange: (id: number) => void
  placeholder: string
  searchPlaceholder?: string
  emptyText?: string
  /** Called with the current search text, so the caller can prefill its create dialog. */
  onCreateNew?: (search: string) => void
  createNewLabel?: string
  /** If given, shows a small "×" to unset the selection — for an optional field. */
  onClear?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const selected = items.find((item) => item.id === value)

  const matches = useMemo(() => filterComboboxItems(items, search), [items, search])
  const visible = matches.slice(0, MAX_VISIBLE_ITEMS)
  const hiddenCount = matches.length - visible.length

  // The list keeps its scroll offset when the matches change; without this the
  // best matches can end up scrolled out of view above the visible area.
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0
  }, [search])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setSearch('')
  }

  function close() {
    handleOpenChange(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full min-w-0 justify-between font-normal"
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <span className="ml-2 flex shrink-0 items-center gap-1">
            {selected && onClear && (
              // Buttons disable pointer-events on descendant <svg>s (so their own click
              // always wins), so the click target here must be this non-svg wrapper.
              <span
                role="button"
                aria-label="Auswahl entfernen"
                className="rounded-sm opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onClear()
                }}
              >
                <XIcon className="size-4" />
              </span>
            )}
            <ChevronsUpDownIcon className="size-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        {/* Filtering is done by filterComboboxItems, not cmdk's fuzzy matcher. */}
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList ref={listRef}>
            {visible.length === 0 && (
              <div className="py-6 text-center text-sm">{emptyText}</div>
            )}
            <CommandGroup>
              {visible.map((item) => (
                <CommandItem
                  key={item.id}
                  // Unique per item, so same-titled entries are never highlighted together.
                  value={String(item.id)}
                  onSelect={() => {
                    onChange(item.id)
                    close()
                  }}
                >
                  <CheckIcon className={cn('size-4', item.id === value ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{item.label}</span>
                    {item.sublabel && (
                      <span className="truncate text-xs text-muted-foreground">{item.sublabel}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {hiddenCount > 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                … und {hiddenCount} weitere – Suche eingrenzen
              </p>
            )}
            {onCreateNew && (
              <CommandGroup forceMount className="sticky bottom-0 border-t bg-popover">
                <CommandItem
                  value="__create_new__"
                  forceMount
                  onSelect={() => {
                    close()
                    onCreateNew(search)
                  }}
                >
                  <PlusIcon className="size-4" />
                  <span className="shrink-0">{createNewLabel}</span>
                  {search.trim() && (
                    <span className="truncate text-muted-foreground">„{search.trim()}“</span>
                  )}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
