import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Table, TableBody, TableRow } from '@/components/ui/table'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TruncatedCell } from './truncated-cell'

function renderCell(props: React.ComponentProps<typeof TruncatedCell>) {
  return render(
    <TooltipProvider>
      <Table>
        <TableBody>
          <TableRow>
            <TruncatedCell {...props} />
          </TableRow>
        </TableBody>
      </Table>
    </TooltipProvider>,
  )
}

describe('TruncatedCell', () => {
  it('shows a dash for an empty value', () => {
    renderCell({ value: null, link: true })
    expect(screen.getByText('–')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders a web URL as a link that opens in a new tab', () => {
    renderCell({ value: 'https://example.com/album', link: true })
    const anchor = screen.getByRole('link', { name: 'https://example.com/album' })
    expect(anchor).toHaveAttribute('href', 'https://example.com/album')
    expect(anchor).toHaveAttribute('target', '_blank')
    expect(anchor).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('keeps relative paths as plain text, since they would resolve against SetLister itself', () => {
    renderCell({ value: '/the-sound-of-syndae', link: true })
    expect(screen.getByText('/the-sound-of-syndae')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('does not make other schemes clickable', () => {
    renderCell({ value: 'javascript:alert(1)', link: true })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders plain text without a link when link is not requested', () => {
    renderCell({ value: 'https://example.com' })
    expect(screen.getByText('https://example.com')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
