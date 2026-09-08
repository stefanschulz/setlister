import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EntityCombobox } from './entity-combobox'

const items = [
  { id: 1, label: 'Artist A' },
  { id: 2, label: 'Artist B', sublabel: 'https://artist-b.example' },
]

describe('EntityCombobox', () => {
  it('shows the placeholder when nothing is selected', () => {
    render(<EntityCombobox items={items} value={undefined} onChange={vi.fn()} placeholder="Pick one" />)
    expect(screen.getByRole('combobox')).toHaveTextContent('Pick one')
  })

  it("shows the selected item's label", () => {
    render(<EntityCombobox items={items} value={2} onChange={vi.fn()} placeholder="Pick one" />)
    expect(screen.getByRole('combobox')).toHaveTextContent('Artist B')
  })

  it('shows the sublabel under the label once opened', async () => {
    const user = userEvent.setup()
    render(<EntityCombobox items={items} value={undefined} onChange={vi.fn()} placeholder="Pick one" />)

    await user.click(screen.getByRole('combobox'))

    expect(screen.getByText('https://artist-b.example')).toBeInTheDocument()
  })

  it('calls onChange with the clicked item and closes the popover', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<EntityCombobox items={items} value={undefined} onChange={onChange} placeholder="Pick one" />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('Artist A'))

    expect(onChange).toHaveBeenCalledWith(1)
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('passes the current search text to onCreateNew', async () => {
    const user = userEvent.setup()
    const onCreateNew = vi.fn()
    render(
      <EntityCombobox
        items={items}
        value={undefined}
        onChange={vi.fn()}
        placeholder="Pick one"
        onCreateNew={onCreateNew}
        createNewLabel="Create new…"
      />,
    )

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByPlaceholderText('Suchen…'), 'Brand New Artist')
    await user.click(screen.getByText('Create new…'))

    expect(onCreateNew).toHaveBeenCalledWith('Brand New Artist')
  })

  it('does not offer "create new" when onCreateNew is not given', async () => {
    const user = userEvent.setup()
    render(<EntityCombobox items={items} value={undefined} onChange={vi.fn()} placeholder="Pick one" />)

    await user.click(screen.getByRole('combobox'))

    expect(screen.queryByText('Neu anlegen…')).not.toBeInTheDocument()
  })

  describe('clear button', () => {
    it('is not shown when nothing is selected, even with onClear given', () => {
      render(
        <EntityCombobox items={items} value={undefined} onChange={vi.fn()} onClear={vi.fn()} placeholder="Pick one" />,
      )
      expect(screen.queryByLabelText('Auswahl entfernen')).not.toBeInTheDocument()
    })

    it('is not shown when a value is selected but onClear is not given', () => {
      render(<EntityCombobox items={items} value={1} onChange={vi.fn()} placeholder="Pick one" />)
      expect(screen.queryByLabelText('Auswahl entfernen')).not.toBeInTheDocument()
    })

    // Note: this does NOT regression-test the pointer-events-none bug the
    // clear button's markup works around (shadcn's Button sets
    // `[&_svg]:pointer-events-none` on descendant <svg>s, which made a raw
    // <XIcon onClick=.../> unclickable in a real browser) — jsdom has no
    // layout/hit-testing engine, so `pointer-events` has no effect here and
    // user-event dispatches straight to whatever element the query resolves,
    // regardless of what a browser would actually deliver the click to. That
    // class of bug only showed up via live Docker/browser testing and would
    // need a real-browser tool (e.g. Playwright) to catch automatically.
    // This test still covers real behavior: the right handler fires, the
    // wrong one doesn't, and the popover doesn't open as a side effect.
    it('calls onClear (not onChange, and without opening the popover) when clicked', async () => {
      const user = userEvent.setup()
      const onClear = vi.fn()
      const onChange = vi.fn()
      render(<EntityCombobox items={items} value={1} onChange={onChange} onClear={onClear} placeholder="Pick one" />)

      await user.click(screen.getByLabelText('Auswahl entfernen'))

      expect(onClear).toHaveBeenCalledTimes(1)
      expect(onChange).not.toHaveBeenCalled()
      expect(screen.queryByRole('option')).not.toBeInTheDocument()
    })
  })
})
