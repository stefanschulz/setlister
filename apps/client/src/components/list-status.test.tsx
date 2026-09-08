import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ListStatus } from './list-status'

const baseProps = { isLoading: false, isError: false, isEmpty: false, emptyMessage: 'Nichts da.' }

describe('ListStatus', () => {
  it('renders children when not loading, not errored, and not empty', () => {
    render(
      <ListStatus {...baseProps}>
        <div>Real content</div>
      </ListStatus>,
    )
    expect(screen.getByText('Real content')).toBeInTheDocument()
  })

  it('shows a loading message while loading, regardless of other flags', () => {
    render(
      <ListStatus {...baseProps} isLoading isError error={new Error('boom')}>
        <div>Real content</div>
      </ListStatus>,
    )
    expect(screen.getByText('Lade…')).toBeInTheDocument()
    expect(screen.queryByText('Real content')).not.toBeInTheDocument()
  })

  it("shows the Error's message on error", () => {
    render(
      <ListStatus {...baseProps} isError error={new Error('Network down')}>
        <div>Real content</div>
      </ListStatus>,
    )
    expect(screen.getByText('Fehler beim Laden: Network down')).toBeInTheDocument()
  })

  it('falls back to a generic message when the error is not an Error instance', () => {
    render(
      <ListStatus {...baseProps} isError error="just a string">
        <div>Real content</div>
      </ListStatus>,
    )
    expect(screen.getByText('Fehler beim Laden: Unbekannter Fehler')).toBeInTheDocument()
  })

  it('shows the empty message when empty (and not loading/errored)', () => {
    render(
      <ListStatus {...baseProps} isEmpty>
        <div>Real content</div>
      </ListStatus>,
    )
    expect(screen.getByText('Nichts da.')).toBeInTheDocument()
    expect(screen.queryByText('Real content')).not.toBeInTheDocument()
  })

  it('prefers the error state over the empty state', () => {
    render(
      <ListStatus {...baseProps} isError error={new Error('boom')} isEmpty>
        <div>Real content</div>
      </ListStatus>,
    )
    expect(screen.getByText('Fehler beim Laden: boom')).toBeInTheDocument()
    expect(screen.queryByText('Nichts da.')).not.toBeInTheDocument()
  })
})
