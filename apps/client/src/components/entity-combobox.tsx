import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from 'lucide-react'
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
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
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
                  value={item.label}
                  onSelect={() => {
                    onChange(item.id)
                    setOpen(false)
                  }}
                >
                  <CheckIcon className={cn('size-4', item.id === value ? 'opacity-100' : 'opacity-0')} />
                  {item.label}
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
