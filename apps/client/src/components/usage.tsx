import {
  formatEpisodeNumber,
  NO_USAGE,
  type Album,
  type Artist,
  type AlbumUsage,
  type ArtistUsage,
  type Track,
  type Usage,
  type UsageEpisode,
} from '@setlister/shared'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { HistoryIcon } from 'lucide-react'
import { RowAction } from '@/components/row-actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TableCell } from '@/components/ui/table'
import { useUsageIndex } from '@/queries/usage'

/** "2026-08-21" -> "21.08.2026" (plain string split, so no time-zone shifting). */
function formatAirDate(airDate: string): string {
  const [year, month, day] = airDate.split('-')
  return `${day}.${month}.${year}`
}

/** The "Gespielt" (number of episodes) and "Zuletzt gespielt" cells of a list row. */
export function UsageCells({ usage }: { usage: Usage }) {
  const { episodes, lastEpisode } = usage
  return (
    <>
      <TableCell className="tabular-nums">
        {episodes.length > 0 ? `${episodes.length}×` : '–'}
      </TableCell>
      <TableCell>
        {lastEpisode ? (
          <span title={lastEpisode.headline}>
            #{formatEpisodeNumber(lastEpisode)}
            {lastEpisode.airDate && (
              <span className="ml-1 text-xs text-muted-foreground">
                {formatAirDate(lastEpisode.airDate)}
              </span>
            )}
          </span>
        ) : (
          '–'
        )}
      </TableCell>
    </>
  )
}

/** The per-row "Verwendung" action that opens a usage dialog. */
export function UsageButton({ onClick }: { onClick: () => void }) {
  return <RowAction label="Verwendung" icon={HistoryIcon} onClick={onClick} />
}

function UsageEpisodeList({
  episodes,
  onNavigate,
}: {
  episodes: UsageEpisode[]
  onNavigate: () => void
}) {
  if (episodes.length === 0) {
    return <p className="text-sm text-muted-foreground">In keiner Episode gespielt.</p>
  }
  return (
    <ul className="flex max-h-96 flex-col overflow-y-auto rounded-md border text-sm">
      {episodes.map((episode) => (
        <li key={episode.episodeId} className="border-b last:border-b-0">
          <Link
            to={`/episodes/${episode.episodeId}`}
            onClick={onNavigate}
            className="flex items-baseline gap-2 px-3 py-1.5 hover:bg-muted"
          >
            <span className="shrink-0 font-medium tabular-nums">
              #{formatEpisodeNumber(episode)}
            </span>
            <span className="min-w-0 flex-1 truncate">{episode.headline || '–'}</span>
            {episode.airDate && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatAirDate(episode.airDate)}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function ItemList({ items, empty }: { items: { key: number; label: string; count: number }[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className="flex max-h-96 flex-col overflow-y-auto rounded-md border text-sm">
      {items.map((item) => (
        <li key={item.key} className="flex items-baseline gap-2 border-b px-3 py-1.5 last:border-b-0">
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {item.count} {item.count === 1 ? 'Episode' : 'Episoden'}
          </span>
        </li>
      ))}
    </ul>
  )
}

function UsageDialogShell({
  title,
  description,
  open,
  onOpenChange,
  children,
}: {
  title: string
  description: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

function playedSummary(usage: Usage): string {
  const n = usage.episodes.length
  return n === 0 ? 'Noch nicht gespielt.' : `Gespielt in ${n} ${n === 1 ? 'Episode' : 'Episoden'}.`
}

export function AlbumUsageDialog({
  album,
  open,
  onOpenChange,
}: {
  album: Album | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { index } = useUsageIndex()
  const usage: AlbumUsage = (album && index.albums.get(album.id)) || { ...NO_USAGE, tracks: [] }
  const close = () => onOpenChange(false)

  return (
    <UsageDialogShell
      title={album?.title ?? ''}
      description={`Album · ${playedSummary(usage)}`}
      open={open}
      onOpenChange={onOpenChange}
    >
      <Tabs defaultValue="tracks">
        <TabsList>
          <TabsTrigger value="tracks">Gespielte Tracks ({usage.tracks.length})</TabsTrigger>
          <TabsTrigger value="episodes">Episoden ({usage.episodes.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="tracks">
          <ItemList
            empty="Kein Track dieses Albums wurde gespielt."
            items={usage.tracks.map((t) => ({ key: t.track.id, label: t.track.title, count: t.episodeCount }))}
          />
        </TabsContent>
        <TabsContent value="episodes">
          <UsageEpisodeList episodes={usage.episodes} onNavigate={close} />
        </TabsContent>
      </Tabs>
    </UsageDialogShell>
  )
}

export function TrackUsageDialog({
  track,
  open,
  onOpenChange,
}: {
  track: Track | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { index } = useUsageIndex()
  const usage = (track && index.tracks.get(track.id)) || NO_USAGE

  return (
    <UsageDialogShell
      title={track?.title ?? ''}
      description={`Track${track ? ` · ${track.album.title}` : ''} · ${playedSummary(usage)}`}
      open={open}
      onOpenChange={onOpenChange}
    >
      <UsageEpisodeList episodes={usage.episodes} onNavigate={() => onOpenChange(false)} />
    </UsageDialogShell>
  )
}

export function ArtistUsageDialog({
  artist,
  open,
  onOpenChange,
}: {
  artist: Artist | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { index } = useUsageIndex()
  const usage: ArtistUsage = (artist && index.artists.get(artist.id)) || { ...NO_USAGE, albums: [] }
  const close = () => onOpenChange(false)

  return (
    <UsageDialogShell
      title={artist?.name ?? ''}
      description={`Künstler · ${playedSummary(usage)}`}
      open={open}
      onOpenChange={onOpenChange}
    >
      <Tabs defaultValue="episodes">
        <TabsList>
          <TabsTrigger value="episodes">Episoden ({usage.episodes.length})</TabsTrigger>
          <TabsTrigger value="albums">Alben ({usage.albums.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="episodes">
          <UsageEpisodeList episodes={usage.episodes} onNavigate={close} />
        </TabsContent>
        <TabsContent value="albums">
          <ItemList
            empty="Von diesem Künstler wurde kein Album gespielt."
            items={usage.albums.map((a) => ({ key: a.album.id, label: a.album.title, count: a.episodeCount }))}
          />
        </TabsContent>
      </Tabs>
    </UsageDialogShell>
  )
}
