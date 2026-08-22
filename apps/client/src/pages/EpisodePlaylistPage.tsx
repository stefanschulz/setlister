import {
  buildAllOutputs,
  formatContributorList,
  OUTPUT_CHANNELS,
  type PlaylistEntryForOutput,
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
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiError } from '@/api/client'
import { useEpisode, useSetPlaylist } from '@/queries/episodes'
import { useTracks } from '@/queries/tracks'

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
  const { data: episode, isLoading } = useEpisode(episodeId)
  const { data: tracks } = useTracks()
  const setPlaylist = useSetPlaylist(episodeId)

  const [entries, setEntries] = useState<LocalEntry[]>([])
  const [dirty, setDirty] = useState(false)
  const [pickerValue, setPickerValue] = useState('')

  useEffect(() => {
    if (episode) {
      setEntries(episode.playlist.map((e) => ({ localId: crypto.randomUUID(), trackId: e.track.id })))
      setDirty(false)
    }
  }, [episode])

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

  const preview = useMemo(() => buildAllOutputs(outputEntries), [outputEntries])

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
    setPickerValue('')
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

  if (isLoading || !episode) {
    return <p className="text-sm text-muted-foreground">Lade…</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/episodes" className="text-sm text-muted-foreground hover:text-foreground">
          ← Episoden
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-lg font-semibold">
            #{episode.number} – {episode.headline}
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

          <Select value={pickerValue} onValueChange={(v) => addTrack(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Track hinzufügen…" />
            </SelectTrigger>
            <SelectContent>
              {tracks?.map((track) => (
                <SelectItem key={track.id} value={String(track.id)}>
                  {track.title} ({track.album.title})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-medium">Vorschau</h2>
          <Tabs defaultValue="html">
            <TabsList>
              <TabsTrigger value="html">HTML</TabsTrigger>
              {OUTPUT_CHANNELS.map((channel) => (
                <TabsTrigger key={channel} value={channel}>
                  {channel}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="html" className="flex flex-col gap-2">
              <div
                className="rounded-md border p-3 text-sm"
                dangerouslySetInnerHTML={{ __html: preview.html }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => copyToClipboard(preview.html, 'HTML')}
              >
                <CopyIcon /> HTML kopieren
              </Button>
            </TabsContent>

            {OUTPUT_CHANNELS.map((channel) => (
              <TabsContent key={channel} value={channel} className="flex flex-col gap-2">
                <p className="rounded-md border p-3 text-sm whitespace-pre-wrap">
                  {preview.text[channel] || '–'}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => copyToClipboard(preview.text[channel], channel)}
                >
                  <CopyIcon /> {channel}-Text kopieren
                </Button>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  )
}
