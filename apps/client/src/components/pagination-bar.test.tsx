import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PaginationBar } from './pagination-bar'

function renderBar(props: Partial<ComponentProps<typeof PaginationBar>> = {}) {
  return render(
    <PaginationBar
      pageSize={25}
      onPageSizeChange={vi.fn()}
      page={2}
      totalPages={3}
      onPageChange={vi.fn()}
      totalItems={60}
      {...props}
    />,
  )
}

describe('PaginationBar', () => {
  it('shows "0 Einträge" when there are no items', () => {
    renderBar({ totalItems: 0, page: 1, totalPages: 1 })
    expect(screen.getByText('0 Einträge')).toBeInTheDocument()
  })

  it('shows the page/total/count summary otherwise', () => {
    renderBar({ page: 2, totalPages: 3, totalItems: 60 })
    expect(screen.getByText('Seite 2 von 3 (60 Einträge)')).toBeInTheDocument()
  })

  it('disables "previous" on the first page, enables it otherwise', () => {
    const { rerender } = renderBar({ page: 1 })

    const [prev] = screen.getAllByRole('button')
    expect(prev).toBeDisabled()

    rerender(
      <PaginationBar
        pageSize={25}
        onPageSizeChange={vi.fn()}
        page={2}
        totalPages={3}
        onPageChange={vi.fn()}
        totalItems={60}
      />,
    )
    expect(screen.getAllByRole('button')[0]).not.toBeDisabled()
  })

  it('disables "next" on the last page, enables it otherwise', () => {
    renderBar({ page: 3, totalPages: 3 })
    const [, next] = screen.getAllByRole('button')
    expect(next).toBeDisabled()
  })

  it('calls onPageChange with page - 1 when "previous" is clicked', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    renderBar({ page: 2, onPageChange })

    const [prev] = screen.getAllByRole('button')
    await user.click(prev)

    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('calls onPageChange with page + 1 when "next" is clicked', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    renderBar({ page: 2, totalPages: 3, onPageChange })

    const [, next] = screen.getAllByRole('button')
    await user.click(next)

    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('shows the current page size, including "Alle" for \'all\'', () => {
    renderBar({ pageSize: 'all' })
    expect(screen.getByText('Alle')).toBeInTheDocument()
  })

  it('calls onPageSizeChange with a number when a numeric option is picked', async () => {
    const user = userEvent.setup()
    const onPageSizeChange = vi.fn()
    renderBar({ pageSize: 25, onPageSizeChange })

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: '200' }))

    expect(onPageSizeChange).toHaveBeenCalledWith(200)
  })

  it("calls onPageSizeChange with 'all' when that option is picked", async () => {
    const user = userEvent.setup()
    const onPageSizeChange = vi.fn()
    renderBar({ pageSize: 25, onPageSizeChange })

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'Alle' }))

    expect(onPageSizeChange).toHaveBeenCalledWith('all')
  })
})
