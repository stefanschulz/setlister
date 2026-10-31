import { describe, expect, it } from 'vitest'
import { filterComboboxItems } from './combobox-filter'

const item = (id: number, label: string, sublabel?: string) => ({ id, label, sublabel })
const ids = (items: { id: number }[]) => items.map((i) => i.id)

describe('filterComboboxItems', () => {
  const items = [
    item(1, 'Sun over under nine days'),
    item(2, 'Sound of Sky'),
    item(3, 'Ambient Sounds'),
    item(4, 'Soundtrack'),
    item(5, 'Résumé'),
  ]

  it('returns the items unchanged (same order) for an empty or blank query', () => {
    expect(filterComboboxItems(items, '')).toBe(items)
    expect(filterComboboxItems(items, '   ')).toBe(items)
  })

  it('requires the query as a text part, not just its letters in order', () => {
    // 'Sun over under nine days' contains s-o-u-n-d as scattered letters (a fuzzy match), but not the text 'sound'.
    expect(ids(filterComboboxItems(items, 'sound'))).toEqual([2, 4, 3])
  })

  it('ignores case and accents', () => {
    expect(ids(filterComboboxItems(items, 'RESUME'))).toEqual([5])
    expect(ids(filterComboboxItems(items, 'résumé'))).toEqual([5])
  })

  it('requires every word of the query, in any order', () => {
    expect(ids(filterComboboxItems(items, 'sky sound'))).toEqual([2])
    expect(ids(filterComboboxItems(items, 'sound sky nothing'))).toEqual([])
  })

  it('ranks label-prefix matches first, then word-start matches, then the rest — alphabetical within a rank', () => {
    const list = [item(1, 'The Sound'), item(2, 'Soundtrack'), item(3, 'Resounding'), item(4, 'Sound of Sky')]
    // rank 0: prefix ("Sound of Sky", "Soundtrack"); rank 1: word start ("The Sound"); rank 2: inside a word ("Resounding")
    expect(ids(filterComboboxItems(list, 'sound'))).toEqual([4, 2, 1, 3])
  })

  it('also searches the sublabel', () => {
    const list = [item(1, 'Crossroads', 'https://icingwolf.bandcamp.com/album/crossroads'), item(2, 'Other')]
    expect(ids(filterComboboxItems(list, 'icingwolf'))).toEqual([1])
  })

  it('does not match on the sublabel for ranking purposes (label prefix still wins)', () => {
    const list = [item(1, 'Zeta', 'alpha link'), item(2, 'Alpha Album')]
    expect(ids(filterComboboxItems(list, 'alpha'))).toEqual([2, 1])
  })
})
