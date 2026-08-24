import {
  buildContributorsHtml,
  buildLinkedHtml,
  compareEpisodeNumbers,
  formatContributorList,
  formatEpisodeNumber,
} from '@setlister/shared'
import type { SetlistEntry } from '@setlister/shared'
import { ArrowDownIcon, ArrowUpIcon, XIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ListStatus } from '@/components/list-status'
import { PaginationBar } from '@/components/pagination-bar'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { usePagination } from '@/hooks/use-pagination'
import { useSetlists } from '@/queries/setlists'
import { cn } from '@/lib/utils'

type SortColumn = 'episode' | 'artist' | 'track' | 'album'
type SortDirection = 'asc' | 'desc'

interface Row {
  entry: SetlistEntry
  artistText: string
  episodeDisplay: string
}

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'episode', label: 'Episode' },
  { key: 'artist', label: 'Künstler' },
  { key: 'track', label: 'Track' },
  { key: 'album', label: 'Album' },
]

function compareRows(a: Row, b: Row, column: SortColumn): number {
  switch (column) {
    case 'episode':
      return compareEpisodeNumbers(
        { number: a.entry.episodeNumber, suffix: a.entry.episodeSuffix },
        { number: b.entry.episodeNumber, suffix: b.entry.episodeSuffix },
      )
    case 'artist':
      return a.artistText.localeCompare(b.artistText, 'de')
    case 'track':
      return a.entry.track.title.localeCompare(b.entry.track.title, 'de')
    case 'album':
      return a.entry.track.album.title.localeCompare(b.entry.track.album.title, 'de')
  }
}

function SortableHead({
  column,
  label,
  sortColumn,
  sortDirection,
  onSort,
}: {
  column: SortColumn
  label: string
  sortColumn: SortColumn
  sortDirection: SortDirection
  onSort: (column: SortColumn) => void
}) {
  const isActive = column === sortColumn
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          'inline-flex items-center gap-1 font-medium hover:text-foreground',
          !isActive && 'text-muted-foreground',
        )}
      >
        {label}
        {isActive &&
          (sortDirection === 'asc' ? (
            <ArrowUpIcon className="size-3.5" />
          ) : (
            <ArrowDownIcon className="size-3.5" />
          ))}
      </button>
    </TableHead>
  )
}

export default function SetlistsPage() {
  const { data: entries, isLoading, isError, error } = useSetlists()

  const [sortColumn, setSortColumn] = useState<SortColumn>('episode')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const [filterEpisode, setFilterEpisode] = useState('')
  const [filterArtist, setFilterArtist] = useState('')
  const [filterTrack, setFilterTrack] = useState('')
  const [filterAlbum, setFilterAlbum] = useState('')
  // Clearing a field (manually or via reset) applies instantly — only new,
  // non-empty text gets debounced.
  const debouncedFilterEpisode = useDebouncedValue(filterEpisode, filterEpisode ? 300 : 0)
  const debouncedFilterArtist = useDebouncedValue(filterArtist, filterArtist ? 300 : 0)
  const debouncedFilterTrack = useDebouncedValue(filterTrack, filterTrack ? 300 : 0)
  const debouncedFilterAlbum = useDebouncedValue(filterAlbum, filterAlbum ? 300 : 0)

  const hasActiveFilters = Boolean(filterEpisode || filterArtist || filterTrack || filterAlbum)

  function resetFilters() {
    setFilterEpisode('')
    setFilterArtist('')
    setFilterTrack('')
    setFilterAlbum('')
  }

  function handleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const rows: Row[] = useMemo(
    () =>
      (entries ?? []).map((entry) => ({
        entry,
        artistText: formatContributorList(
          entry.track.contributors.map((c) => ({
            name: c.artist.name,
            role: c.role,
            position: c.position,
          })),
        ),
        episodeDisplay: formatEpisodeNumber({ number: entry.episodeNumber, suffix: entry.episodeSuffix }),
      })),
    [entries],
  )

  const filteredSorted = useMemo(() => {
    const episodeNeedle = debouncedFilterEpisode.trim().toLowerCase()
    const artistNeedle = debouncedFilterArtist.trim().toLowerCase()
    const trackNeedle = debouncedFilterTrack.trim().toLowerCase()
    const albumNeedle = debouncedFilterAlbum.trim().toLowerCase()

    const filtered = rows.filter(
      (row) =>
        (!episodeNeedle || row.episodeDisplay.toLowerCase().includes(episodeNeedle)) &&
        (!artistNeedle || row.artistText.toLowerCase().includes(artistNeedle)) &&
        (!trackNeedle || row.entry.track.title.toLowerCase().includes(trackNeedle)) &&
        (!albumNeedle || row.entry.track.album.title.toLowerCase().includes(albumNeedle)),
    )

    const sign = sortDirection === 'asc' ? 1 : -1
    return filtered.sort((a, b) => sign * compareRows(a, b, sortColumn))
  }, [
    rows,
    debouncedFilterEpisode,
    debouncedFilterArtist,
    debouncedFilterTrack,
    debouncedFilterAlbum,
    sortColumn,
    sortDirection,
  ])

  const { pageSize, setPageSize, page, setPage, totalPages, pageItems: pageRows } =
    usePagination(filteredSorted, 50)

  useEffect(() => {
    setPage(1)
  }, [debouncedFilterEpisode, debouncedFilterArtist, debouncedFilterTrack, debouncedFilterAlbum, setPage])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Setlisten</h1>
          <p className="text-sm text-muted-foreground">
            Alle jemals gespielten Tracks, über alle Episoden hinweg.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetFilters} disabled={!hasActiveFilters}>
          <XIcon /> Filter zurücksetzen
        </Button>
      </div>

      <ListStatus
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage="Noch keine Playlist-Einträge vorhanden."
      >
        <div className="flex flex-col gap-3">
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((col) => (
                  <SortableHead
                    key={col.key}
                    column={col.key}
                    label={col.label}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                ))}
              </TableRow>
              <TableRow>
                <TableHead>
                  <Input
                    value={filterEpisode}
                    onChange={(e) => setFilterEpisode(e.target.value)}
                    placeholder="Filtern…"
                    className="h-8"
                  />
                </TableHead>
                <TableHead>
                  <Input
                    value={filterArtist}
                    onChange={(e) => setFilterArtist(e.target.value)}
                    placeholder="Filtern…"
                    className="h-8"
                  />
                </TableHead>
                <TableHead>
                  <Input
                    value={filterTrack}
                    onChange={(e) => setFilterTrack(e.target.value)}
                    placeholder="Filtern…"
                    className="h-8"
                  />
                </TableHead>
                <TableHead>
                  <Input
                    value={filterAlbum}
                    onChange={(e) => setFilterAlbum(e.target.value)}
                    placeholder="Filtern…"
                    className="h-8"
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Keine Treffer für die aktuellen Filter.
                  </TableCell>
                </TableRow>
              )}
              {pageRows.map((row) => (
                <TableRow key={row.entry.id}>
                  <TableCell>{row.episodeDisplay}</TableCell>
                  <TableCell
                    className="*:[a]:underline *:[a]:underline-offset-2 *:[a]:decoration-muted-foreground *:[a]:hover:decoration-foreground"
                    dangerouslySetInnerHTML={{
                      __html: buildContributorsHtml(row.entry.track.contributors),
                    }}
                  />
                  <TableCell>{row.entry.track.title}</TableCell>
                  <TableCell
                    className="*:[a]:underline *:[a]:underline-offset-2 *:[a]:decoration-muted-foreground *:[a]:hover:decoration-foreground"
                    dangerouslySetInnerHTML={{
                      __html: buildLinkedHtml(row.entry.track.album.title, row.entry.track.album.link),
                    }}
                  />
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <PaginationBar
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filteredSorted.length}
          />
        </div>
      </ListStatus>
    </div>
  )
}
