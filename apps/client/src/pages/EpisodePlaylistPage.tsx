import {
  buildAllOutputs,
  formatContributorList,
  formatEpisodeNumber,
  type EpisodeDetail,
  type OutputChannel,
  type PlaylistEntryForOutput,
  type Track,
} from '@setlister/shared'
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CopyIcon, GripVerticalIcon, TrashIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiError } from '@/api/client'
import { EntityCombobox } from '@/components/entity-combobox'
import { useEpisode, useSetPlaylist } from '@/queries/episodes'
import { useOutputChannels } from '@/queries/output-channels'
import { useTracks } from '@/queries/tracks'
import { TrackDialog } from './TracksPage'

interface LocalEntry {
  localId: string
  trackId: number
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(`${label} kopiert`))
    .catch(() => toast.error('Kopieren fehlgeschlagen'))
}

function SortablePlaylistRow({
  entry,
  title,
  subtitle,
  onRemove,
}: {
  entry: LocalEntry
  title: string
  subtitle: string
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.localId,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-md border p-2">
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <div className="min-w-0 flex-1 text-sm">
        <span className="font-medium">{title}</span>{' '}
        <span className="text-muted-foreground">{subtitle}</span>
      </div>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
        <TrashIcon />
      </Button>
    </div>
  )
}

export default function EpisodePlaylistPage() {
  const { id } = useParams<{ id: string }>()
  const episodeId = Number(id)
  const { data: episode, isLoading, isError, error } = useEpisode(episodeId)
  const { data: tracks, isError: tracksIsError } = useTracks()
  const { data: channels } = useOutputChannels()
  const setPlaylist = useSetPlaylist(episodeId)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Lade…</p>
  }
  if (isError || !episode) {
    return (
      <p className="text-sm text-destructive">
        Fehler beim Laden: {error instanceof Error ? error.message : 'Unbekannter Fehler'}
      </p>
    )
  }

  return (
    <PlaylistContent
      key={episode.id}
      episode={episode}
      tracks={tracks}
      channels={channels}
      setPlaylist={setPlaylist}
      tracksIsError={tracksIsError}
    />
  )
}

function PlaylistContent({
  episode,
  tracks,
  channels,
  setPlaylist,
  tracksIsError,
}: {
  episode: EpisodeDetail
  tracks: Track[] | undefined
  channels: OutputChannel[] | undefined
  setPlaylist: ReturnType<typeof useSetPlaylist>
  tracksIsError: boolean
}) {
  const [entries, setEntries] = useState<LocalEntry[]>(() =>
    episode.playlist.map((e) => ({ localId: crypto.randomUUID(), trackId: e.track.id }))
  )
  const [dirty, setDirty] = useState(false)
  const [newTrackDialogOpen, setNewTrackDialogOpen] = useState(false)
  const [newTrackTitle, setNewTrackTitle] = useState('')

  const tracksById = useMemo(() => new Map((tracks ?? []).map((t) => [t.id, t])), [tracks])

  const outputEntries: PlaylistEntryForOutput[] = useMemo(
    () =>
      entries
        .map((entry, index): PlaylistEntryForOutput | null => {
          const track = tracksById.get(entry.trackId)
          if (!track) return null
          return {
            position: index,
            track: { title: track.title, album: track.album, contributors: track.contributors },
          }
        })
        .filter((e): e is PlaylistEntryForOutput => e !== null),
    [entries, tracksById],
  )

  const preview = useMemo(
    () =>
      buildAllOutputs(outputEntries, channels ?? [], {
        number: episode.number,
        suffix: episode.suffix,
        headline: episode.headline,
      }),
    [outputEntries, channels, episode.number, episode.suffix, episode.headline],
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setEntries((items) => {
      const oldIndex = items.findIndex((i) => i.localId === active.id)
      const newIndex = items.findIndex((i) => i.localId === over.id)
      return arrayMove(items, oldIndex, newIndex)
    })
    setDirty(true)
  }

  function addTrack(trackId: number) {
    setEntries((items) => [...items, { localId: crypto.randomUUID(), trackId }])
    setDirty(true)
  }

  function removeEntry(localId: string) {
    setEntries((items) => items.filter((i) => i.localId !== localId))
    setDirty(true)
  }

  async function handleSave() {
    try {
      await setPlaylist.mutateAsync(entries.map((e) => e.trackId))
      toast.success('Playlist gespeichert')
      setDirty(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unbekannter Fehler')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/episodes" className="text-sm text-muted-foreground hover:text-foreground">
          ← Episoden
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-lg font-semibold">
            #{formatEpisodeNumber(episode)} – {episode.headline}
          </h1>
          <Badge variant={episode.published ? 'default' : 'secondary'}>
            {episode.published ? 'Veröffentlicht' : 'Entwurf'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{episode.topic}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Playlist</h2>
            <Button size="sm" onClick={handleSave} disabled={!dirty || setPlaylist.isPending}>
              Speichern
            </Button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={entries.map((e) => e.localId)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2">
                {entries.map((entry) => {
                  const track = tracksById.get(entry.trackId)
                  if (!track) return null
                  const contributors = formatContributorList(
                    track.contributors.map((c) => ({
                      name: c.artist.name,
                      role: c.role,
                      position: c.position,
                    })),
                  )
                  return (
                    <SortablePlaylistRow
                      key={entry.localId}
                      entry={entry}
                      title={`${contributors} - ${track.title}`}
                      subtitle={`(${track.album.title})`}
                      onRemove={() => removeEntry(entry.localId)}
                    />
                  )
                })}
                {entries.length === 0 && (
                  <p className="text-sm text-muted-foreground">Noch keine Tracks in der Playlist.</p>
                )}
              </div>
            </SortableContext>
          </DndContext>

          {tracksIsError && (
            <p className="text-xs text-destructive">Tracks konnten nicht geladen werden.</p>
          )}
          <div className="max-w-md">
            <EntityCombobox
              items={(tracks ?? []).map((track) => ({
                id: track.id,
                label: `${track.title} (${track.album.title})`,
              }))}
              value={undefined}
              onChange={addTrack}
              placeholder="Track hinzufügen…"
              onCreateNew={(search) => {
                setNewTrackTitle(search)
                setNewTrackDialogOpen(true)
              }}
              createNewLabel="Neuen Track anlegen…"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 md:sticky md:top-6 md:self-start">
          <h2 className="font-medium">Vorschau</h2>
          <Tabs defaultValue="html">
            <TabsList>
              <TabsTrigger value="html">HTML</TabsTrigger>
              {channels?.map((channel) => (
                <TabsTrigger key={channel.id} value={String(channel.id)}>
                  {channel.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="html" className="flex flex-col gap-2">
              <div
                className="rounded-md border p-3 text-sm"
                dangerouslySetInnerHTML={{ __html: preview.html }}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => copyToClipboard(preview.html, 'HTML')}
                >
                  <CopyIcon /> HTML kopieren
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => copyToClipboard(preview.plainText, 'Text')}
                >
                  <CopyIcon /> Als Text kopieren
                </Button>
              </div>
            </TabsContent>

            {channels?.map((channel) => (
              <TabsContent key={channel.id} value={String(channel.id)} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-medium text-muted-foreground">Vollständiger Post-Text</h3>
                  <p className="rounded-md border p-3 text-sm whitespace-pre-wrap">
                    {preview.headlineText[channel.id] || '–'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => copyToClipboard(preview.headlineText[channel.id], `${channel.name}-Post`)}
                  >
                    <CopyIcon /> Post-Text kopieren
                  </Button>
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-medium text-muted-foreground">Nur Tracklist</h3>
                  <p className="rounded-md border p-3 text-sm whitespace-pre-wrap">
                    {preview.text[channel.id] || '–'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => copyToClipboard(preview.text[channel.id], channel.name)}
                  >
                    <CopyIcon /> {channel.name}-Text kopieren
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      <TrackDialog
        track={null}
        initialTitle={newTrackTitle}
        open={newTrackDialogOpen}
        onOpenChange={setNewTrackDialogOpen}
        onCreated={(newTrack) => addTrack(newTrack.id)}
      />
    </div>
  )
}
