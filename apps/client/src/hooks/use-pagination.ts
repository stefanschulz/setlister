import { useState } from 'react'

export type PageSize = 25 | 50 | 200 | 'all'
export const PAGE_SIZE_OPTIONS: PageSize[] = [25, 50, 200, 'all']

// Shared across all list pages so the choice survives navigation for the
// rest of the browser session, but resets on a fresh session (new tab).
const STORAGE_KEY = 'setlister:pageSize'

function readStoredPageSize(defaultPageSize: PageSize): PageSize {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw === 'all') return 'all'
    const n = Number(raw)
    if (raw && PAGE_SIZE_OPTIONS.includes(n as PageSize)) return n as PageSize
  } catch {
    // sessionStorage unavailable (e.g. private browsing) — fall back silently.
  }
  return defaultPageSize
}

export function usePagination<T>(items: T[], defaultPageSize: PageSize = 50) {
  const [pageSize, setPageSizeState] = useState<PageSize>(() => readStoredPageSize(defaultPageSize))
  const [page, setPage] = useState(1)

  function setPageSize(size: PageSize) {
    setPageSizeState(size)
    setPage(1)
    try {
      sessionStorage.setItem(STORAGE_KEY, String(size))
    } catch {
      // ignore — persistence is a nice-to-have, not required for correctness.
    }
  }

  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageItems =
    pageSize === 'all' ? items : items.slice((safePage - 1) * pageSize, safePage * pageSize)

  return { pageSize, setPageSize, page: safePage, setPage, totalPages, pageItems }
}
