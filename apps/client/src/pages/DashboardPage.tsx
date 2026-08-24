import { compareEpisodeNumbers, formatEpisodeNumber, type Episode } from '@setlister/shared'
import { ListMusicIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ListStatus } from '@/components/list-status'
import { useAlbums } from '@/queries/albums'
import { useArtists } from '@/queries/artists'
import { useEpisodes } from '@/queries/episodes'
import { useOutputChannels } from '@/queries/output-channels'
import { useTracks } from '@/queries/tracks'
import { AlbumDialog } from './AlbumsPage'
import { ArtistDialog } from './ArtistsPage'
import { EpisodeDialog } from './EpisodesPage'
import { TrackDialog } from './TracksPage'

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data: episodes, isLoading, isError, error } = useEpisodes()
  const { data: artists } = useArtists()
  const { data: albums } = useAlbums()
  const { data: tracks } = useTracks()
  const { data: channels } = useOutputChannels()

  const [dialogEpisode, setDialogEpisode] = useState<Episode | null>(null)
  const [episodeDialogOpen, setEpisodeDialogOpen] = useState(false)
  const [artistDialogOpen, setArtistDialogOpen] = useState(false)
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false)
  const [trackDialogOpen, setTrackDialogOpen] = useState(false)

  function openCreateEpisode() {
    setDialogEpisode(null)
    setEpisodeDialogOpen(true)
  }

  function openEditEpisode(episode: Episode) {
    setDialogEpisode(episode)
    setEpisodeDialogOpen(true)
  }

  const publishedCount = episodes?.filter((e) => e.published).length ?? 0
  const draftEpisodes = (episodes ?? [])
    .filter((e) => !e.published)
    .sort(compareEpisodeNumbers)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Episoden (veröff. / gesamt)" value={`${publishedCount} / ${episodes?.length ?? 0}`} />
        <StatTile label="Künstler" value={artists?.length ?? 0} />
        <StatTile label="Alben" value={albums?.length ?? 0} />
        <StatTile label="Tracks" value={tracks?.length ?? 0} />
        <StatTile label="Ausgabekanäle" value={channels?.length ?? 0} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-medium">Entwürfe</h2>
        <ListStatus
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={draftEpisodes.length === 0}
          emptyMessage="Keine offenen Entwürfe – alle Episoden sind veröffentlicht."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nr.</TableHead>
                <TableHead>Schlagzeile</TableHead>
                <TableHead>Thema</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {draftEpisodes.map((episode) => (
                <TableRow key={episode.id}>
                  <TableCell>{formatEpisodeNumber(episode)}</TableCell>
                  <TableCell>{episode.headline}</TableCell>
                  <TableCell>{episode.topic}</TableCell>
                  <TableCell className="flex justify-end gap-2 text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/episodes/${episode.id}`}>
                        <ListMusicIcon /> Playlist
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditEpisode(episode)}>
                      Bearbeiten
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ListStatus>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-medium">Schnellzugriff</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openCreateEpisode}>
            <PlusIcon /> Neue Episode
          </Button>
          <Button variant="outline" onClick={() => setArtistDialogOpen(true)}>
            <PlusIcon /> Neuer Künstler
          </Button>
          <Button variant="outline" onClick={() => setAlbumDialogOpen(true)}>
            <PlusIcon /> Neues Album
          </Button>
          <Button variant="outline" onClick={() => setTrackDialogOpen(true)}>
            <PlusIcon /> Neuer Track
          </Button>
        </div>
      </div>

      <EpisodeDialog
        episode={dialogEpisode}
        open={episodeDialogOpen}
        onOpenChange={setEpisodeDialogOpen}
        onCreated={(created) => {
          if (!dialogEpisode) navigate(`/episodes/${created.id}`)
        }}
      />
      <ArtistDialog artist={null} open={artistDialogOpen} onOpenChange={setArtistDialogOpen} />
      <AlbumDialog album={null} open={albumDialogOpen} onOpenChange={setAlbumDialogOpen} />
      <TrackDialog track={null} open={trackDialogOpen} onOpenChange={setTrackDialogOpen} />
    </div>
  )
}
