import type { ReactNode } from 'react'

/**
 * Common loading/error/empty handling for a list view, so each page just
 * describes its empty-state copy instead of repeating the same branches.
 */
export function ListStatus({
  isLoading,
  isError,
  error,
  isEmpty,
  emptyMessage,
  children,
}: {
  isLoading: boolean
  isError: boolean
  error?: unknown
  isEmpty: boolean
  emptyMessage: string
  children: ReactNode
}) {
  if (isLoading) return <p className="text-sm text-muted-foreground">Lade…</p>
  if (isError) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return <p className="text-sm text-destructive">Fehler beim Laden: {message}</p>
  }
  if (isEmpty) return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  return <>{children}</>
}
