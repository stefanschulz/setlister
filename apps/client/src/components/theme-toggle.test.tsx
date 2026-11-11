import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from './theme-provider'
import { ThemeToggle } from './theme-toggle'
import { TooltipProvider } from '@/components/ui/tooltip'

function renderToggle() {
  return render(
    <ThemeProvider>
      <TooltipProvider>
        <ThemeToggle />
      </TooltipProvider>
    </ThemeProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
  document.documentElement.removeAttribute('style')
})

describe('ThemeToggle', () => {
  it('starts on "System" when nothing is stored', () => {
    renderToggle()
    expect(screen.getByRole('button', { name: /^Design: System/ })).toBeInTheDocument()
  })

  it('cycles System → Hell → Dunkel → System and names the next step', async () => {
    const user = userEvent.setup()
    renderToggle()

    await user.click(screen.getByRole('button', { name: 'Design: System (klicken für Hell)' }))
    expect(screen.getByRole('button', { name: 'Design: Hell (klicken für Dunkel)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Design: Hell (klicken für Dunkel)' }))
    expect(screen.getByRole('button', { name: 'Design: Dunkel (klicken für System)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Design: Dunkel (klicken für System)' }))
    expect(screen.getByRole('button', { name: 'Design: System (klicken für Hell)' })).toBeInTheDocument()
  })

  it('sets and removes the "dark" class on <html> and remembers the choice', async () => {
    const user = userEvent.setup()
    renderToggle()

    await user.click(screen.getByRole('button', { name: /^Design: System/ })) // -> light
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('light')

    await user.click(screen.getByRole('button', { name: /^Design: Hell/ })) // -> dark
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('dark')

    await user.click(screen.getByRole('button', { name: /^Design: Dunkel/ })) // -> system
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('system')
  })

  it('restores a stored choice on load', () => {
    localStorage.setItem('theme', 'dark')
    renderToggle()
    expect(screen.getByRole('button', { name: /^Design: Dunkel/ })).toBeInTheDocument()
    expect(document.documentElement).toHaveClass('dark')
  })
})
