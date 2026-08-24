import { useState } from 'react'

export type PageSize = 25 | 50 | 200 | 'all'
export const PAGE_SIZE_OPTIONS: PageSize[] = [25, 50, 200, 'all']

export function usePagination<T>(items: T[], defaultPageSize: PageSize = 50) {
  const [pageSize, setPageSizeState] = useState<PageSize>(defaultPageSize)
  const [page, setPage] = useState(1)

  function setPageSize(size: PageSize) {
    setPageSizeState(size)
    setPage(1)
  }

  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageItems =
    pageSize === 'all' ? items : items.slice((safePage - 1) * pageSize, safePage * pageSize)

  return { pageSize, setPageSize, page: safePage, setPage, totalPages, pageItems }
}
