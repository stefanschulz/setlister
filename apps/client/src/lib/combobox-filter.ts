import type { ComboboxItem } from '@/components/entity-combobox'

const normalize = (value: string) =>
  value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Filters combobox items by the search text: every word of the query must
 * occur in the label (or sublabel), ignoring case and accents. Unlike cmdk's
 * built-in fuzzy matching (which accepts any title containing the query's
 * letters in order), this keeps the list short. Results are ranked — label
 * starts with the query, then a word starts with it, then anywhere — and
 * alphabetical within a rank. An empty query returns the items unchanged.
 */
export function filterComboboxItems(items: ComboboxItem[], query: string): ComboboxItem[] {
  const full = normalize(query).trim()
  const words = full.split(/\s+/).filter(Boolean)
  if (words.length === 0) return items

  const matches: { item: ComboboxItem; label: string; rank: number }[] = []
  for (const item of items) {
    const label = normalize(item.label)
    const haystack = item.sublabel ? `${label} ${normalize(item.sublabel)}` : label
    if (!words.every((word) => haystack.includes(word))) continue
    const rank = label.startsWith(full) ? 0 : label.startsWith(words[0]) || label.includes(` ${words[0]}`) ? 1 : 2
    matches.push({ item, label, rank })
  }
  matches.sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label, 'de'))
  return matches.map((m) => m.item)
}
