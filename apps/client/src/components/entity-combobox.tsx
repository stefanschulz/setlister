import { CheckIcon, ChevronsUpDownIcon, PlusIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface ComboboxItem {
  id: number
  label: string
  /** Shown as smaller, muted text below the label — e.g. a link, to help disambiguate same-titled entries. */
  sublabel?: string
}

/**
 * Searchable replacement for a plain <Select> once a list can realistically
 * grow past a few dozen entries (tracks, artists) — type-to-filter instead of
 * scrolling a long dropdown. Optionally offers a trailing "+ create new" row
 * that hands off to the caller (e.g. to open that entity's own create dialog)
 * rather than creating anything itself.
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
  const selected = items.find((item) => item.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
        <Command>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.sublabel ? `${item.label} ${item.sublabel}` : item.label}
                  onSelect={() => {
                    onChange(item.id)
                    setOpen(false)
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
            {onCreateNew && (
              <>
                <CommandSeparator />
                <CommandGroup forceMount>
                  <CommandItem
                    value={`__create_new__`}
                    forceMount
                    onSelect={() => {
                      setOpen(false)
                      onCreateNew(search)
                    }}
                  >
                    <PlusIcon className="size-4" />
                    {createNewLabel}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
