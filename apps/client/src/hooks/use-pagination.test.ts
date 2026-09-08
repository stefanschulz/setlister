import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { usePagination } from './use-pagination'

beforeEach(() => {
  sessionStorage.clear()
})

describe('usePagination', () => {
  it('paginates items according to the default page size', () => {
    const items = Array.from({ length: 30 }, (_, i) => i)
    const { result } = renderHook(() => usePagination(items, 25))

    expect(result.current.pageItems).toEqual(items.slice(0, 25))
    expect(result.current.totalPages).toBe(2)
    expect(result.current.page).toBe(1)
  })

  it('advances to the requested page', () => {
    const items = Array.from({ length: 30 }, (_, i) => i)
    const { result } = renderHook(() => usePagination(items, 25))

    act(() => result.current.setPage(2))

    expect(result.current.page).toBe(2)
    expect(result.current.pageItems).toEqual(items.slice(25, 30))
  })

  it('clamps the current page down when it no longer exists (e.g. after filtering)', () => {
    const { result, rerender } = renderHook(({ items }) => usePagination(items, 25), {
      initialProps: { items: Array.from({ length: 60 }, (_, i) => i) },
    })
    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)

    rerender({ items: [0, 1] })

    expect(result.current.page).toBe(1)
    expect(result.current.pageItems).toEqual([0, 1])
  })

  it('"all" page size returns every item on a single page', () => {
    const items = Array.from({ length: 30 }, (_, i) => i)
    const { result } = renderHook(() => usePagination(items, 25))

    act(() => result.current.setPageSize('all'))

    expect(result.current.totalPages).toBe(1)
    expect(result.current.pageItems).toEqual(items)
  })

  it('changing the page size resets back to page 1', () => {
    const items = Array.from({ length: 60 }, (_, i) => i)
    const { result } = renderHook(() => usePagination(items, 25))
    act(() => result.current.setPage(3))

    act(() => result.current.setPageSize(50))

    expect(result.current.page).toBe(1)
    expect(result.current.pageItems).toEqual(items.slice(0, 50))
  })

  it('persists the chosen page size in sessionStorage and restores it on next mount', () => {
    const items = [0, 1, 2]
    const { result } = renderHook(() => usePagination(items, 25))
    act(() => result.current.setPageSize(200))

    const { result: result2 } = renderHook(() => usePagination(items, 25))

    expect(result2.current.pageSize).toBe(200)
  })
})
