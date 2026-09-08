import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Table, TableBody, TableHeader, TableRow } from '@/components/ui/table'
import { SortableHead } from './sortable-table-head'

function renderHead(props: Partial<ComponentProps<typeof SortableHead<'title' | 'link'>>> = {}) {
  return render(
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead
            column="title"
            label="Titel"
            sortColumn="title"
            sortDirection="asc"
            onSort={vi.fn()}
            {...props}
          />
        </TableRow>
      </TableHeader>
      <TableBody />
    </Table>,
  )
}

describe('SortableHead', () => {
  it('renders the label', () => {
    renderHead()
    expect(screen.getByRole('button')).toHaveTextContent('Titel')
  })

  it('shows no arrow when this column is not the active sort column', () => {
    renderHead({ sortColumn: 'link' })
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('shows an up arrow when active and ascending', () => {
    renderHead({ sortColumn: 'title', sortDirection: 'asc' })
    expect(document.querySelector('.lucide-arrow-up')).toBeInTheDocument()
    expect(document.querySelector('.lucide-arrow-down')).not.toBeInTheDocument()
  })

  it('shows a down arrow when active and descending', () => {
    renderHead({ sortColumn: 'title', sortDirection: 'desc' })
    expect(document.querySelector('.lucide-arrow-down')).toBeInTheDocument()
    expect(document.querySelector('.lucide-arrow-up')).not.toBeInTheDocument()
  })

  it('calls onSort with its own column when clicked', async () => {
    const user = userEvent.setup()
    const onSort = vi.fn()
    renderHead({ column: 'link', sortColumn: 'title', onSort })

    await user.click(screen.getByRole('button'))

    expect(onSort).toHaveBeenCalledWith('link')
  })
})
