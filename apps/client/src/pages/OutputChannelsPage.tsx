import { type OutputChannel, type OutputChannelInput, outputChannelInputSchema } from '@setlister/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ApiError } from '@/api/client'
import { ListStatus } from '@/components/list-status'
import {
  useCreateOutputChannel,
  useDeleteOutputChannel,
  useOutputChannels,
  useUpdateOutputChannel,
} from '@/queries/output-channels'

const emptyValues: OutputChannelInput = { name: '', pattern: '' }

function toFormValues(channel: OutputChannel): OutputChannelInput {
  return { name: channel.name, pattern: channel.pattern }
}

function OutputChannelDialog({
  channel,
  open,
  onOpenChange,
}: {
  channel: OutputChannel | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createChannel = useCreateOutputChannel()
  const updateChannel = useUpdateOutputChannel()
  const form = useForm<OutputChannelInput>({
    resolver: zodResolver(outputChannelInputSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (open) form.reset(channel ? toFormValues(channel) : emptyValues)
  }, [open, channel, form])

  async function onSubmit(values: OutputChannelInput) {
    try {
      if (channel) {
        await updateChannel.mutateAsync({ id: channel.id, input: values })
        toast.success(`${values.name} aktualisiert`)
      } else {
        await createChannel.mutateAsync(values)
        toast.success(`${values.name} angelegt`)
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unbekannter Fehler')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{channel ? 'Ausgabekanal bearbeiten' : 'Ausgabekanal anlegen'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="z. B. Facebook" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pattern">Ausgabe-Muster</Label>
            <Input id="pattern" placeholder="{artists} ({album})" {...form.register('pattern')} />
            <p className="text-xs text-muted-foreground">
              Platzhalter: <code>{'{artists}'}</code>, <code>{'{track}'}</code>, <code>{'{album}'}</code>
            </p>
            {form.formState.errors.pattern && (
              <p className="text-xs text-destructive">{form.formState.errors.pattern.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function OutputChannelsPage() {
  const { data: channels, isLoading, isError, error } = useOutputChannels()
  const deleteChannel = useDeleteOutputChannel()
  const [dialogChannel, setDialogChannel] = useState<OutputChannel | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  function openCreate() {
    setDialogChannel(null)
    setDialogOpen(true)
  }

  function openEdit(channel: OutputChannel) {
    setDialogChannel(channel)
    setDialogOpen(true)
  }

  async function onDelete(channel: OutputChannel) {
    if (!window.confirm(`"${channel.name}" wirklich löschen?`)) return
    try {
      await deleteChannel.mutateAsync(channel.id)
      toast.success(`${channel.name} gelöscht`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unbekannter Fehler')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Ausgabekanäle</h1>
        <Button onClick={openCreate}>
          <PlusIcon /> Neu
        </Button>
      </div>

      <ListStatus
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={(channels?.length ?? 0) === 0}
        emptyMessage="Noch keine Ausgabekanäle angelegt."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Muster</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels?.map((channel) => (
              <TableRow key={channel.id}>
                <TableCell>{channel.name}</TableCell>
                <TableCell className="font-mono text-xs">{channel.pattern}</TableCell>
                <TableCell className="flex justify-end gap-2 text-right">
                  <Button variant="outline" size="sm" onClick={() => openEdit(channel)}>
                    Bearbeiten
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(channel)}>
                    Löschen
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListStatus>

      <OutputChannelDialog channel={dialogChannel} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
