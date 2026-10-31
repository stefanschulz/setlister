import { buildUsageIndex } from '@setlister/shared'
import { useMemo } from 'react'
import { useSetlists } from './setlists'

/** Where each track/album/artist was played, derived from the cross-episode setlist. */
export function useUsageIndex() {
  const { data: entries, isLoading, isError } = useSetlists()
  const index = useMemo(() => buildUsageIndex(entries ?? []), [entries])
  return { index, isLoading, isError }
}
