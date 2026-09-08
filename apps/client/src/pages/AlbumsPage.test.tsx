import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Album, Label } from '@setlister/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { AlbumDialog } from './AlbumsPage'

vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>()
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

const label: Label = { id: 1, name: 'Label One', link: null, facebookReferenceName: null }
const albumWithLabel: Album = { id: 5, title: 'Some Album', link: null, labelId: 1, label }

function renderDialog(album: Album | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AlbumDialog album={album} open={true} onOpenChange={vi.fn()} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (path === '/labels') return [label] as never
    throw new Error(`unexpected GET ${path}`)
  })
  vi.mocked(api.put).mockResolvedValue({ ...albumWithLabel, labelId: null, label: null })
})

describe('AlbumDialog — label field', () => {
  // Regression test for a real bug: react-hook-form's Controller falls back
  // to the field's last non-undefined default value when set to `undefined`
  // outside of a full form reset, so clearing the label combobox silently
  // failed to clear until the fix (send `null` instead — see AlbumsPage's
  // onClear). Unlike the pointer-events-none combobox bug, this one is pure
  // state logic with no CSS/hit-testing involved, so jsdom can catch it.
  it('submits labelId: null after the label is cleared, not the original value', async () => {
    const user = userEvent.setup()
    renderDialog(albumWithLabel)

    // The label list loads asynchronously (useLabels), so the combobox only
    // resolves "selected" (and thus shows the name instead of the
    // placeholder) once that query settles — wait for the text, not just
    // for the element to mount.
    await screen.findByText('Label One')

    await user.click(screen.getByLabelText('Auswahl entfernen'))
    expect(screen.getByRole('combobox')).toHaveTextContent('Label wählen (optional)')

    await user.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(api.put).toHaveBeenCalledWith(
      '/albums/5',
      expect.objectContaining({ labelId: null }),
    )
  })

  it('leaves labelId untouched when the label is not touched', async () => {
    const user = userEvent.setup()
    renderDialog(albumWithLabel)

    // The label list loads asynchronously (useLabels), so the combobox only
    // resolves "selected" (and thus shows the name instead of the
    // placeholder) once that query settles — wait for the text, not just
    // for the element to mount.
    await screen.findByText('Label One')

    await user.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(api.put).toHaveBeenCalledWith('/albums/5', expect.objectContaining({ labelId: 1 }))
  })
})
