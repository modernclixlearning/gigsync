import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChordOverlay } from '../ChordOverlay'

describe('ChordOverlay — inline insert controls (gs#17)', () => {
  it('renders "+ Linea" and "+ Sección" with matching box + focus-visible ring styles', () => {
    render(<ChordOverlay lyrics={'[C]Hola mundo'} isEditable />)

    const addLineButtons = screen.getAllByRole('button', { name: '+ Linea' })
    const addSectionButtons = screen.getAllByRole('button', { name: '+ Sección' })

    expect(addLineButtons.length).toBeGreaterThan(0)
    expect(addSectionButtons.length).toBeGreaterThan(0)

    for (const button of [...addLineButtons, ...addSectionButtons]) {
      // Same box model (size/shape) for both controls.
      expect(button).toHaveClass('text-xs', 'px-2', 'py-1', 'rounded-full')
      // Custom focus-visible ring instead of the browser default outline —
      // otherwise "+ Sección" looks bigger/shifted while it keeps focus with
      // the SectionPicker popover open (gs#17 root cause).
      expect(button).toHaveClass('focus:outline-none', 'focus-visible:ring-2')
      // Both controls sit inside an identical `relative` wrapper so the
      // wrapper needed to anchor the SectionPicker popover doesn't introduce
      // a layout difference versus "+ Linea".
      expect(button.parentElement).toHaveClass('relative')
    }
  })
})

describe('ChordOverlay — delete-line icon button (gs#18)', () => {
  it('exposes an accessible "Eliminar línea" icon button next to + Linea / + Sección and deletes that line on click', async () => {
    const user = userEvent.setup()
    const onLyricsChange = vi.fn()
    render(
      <ChordOverlay
        lyrics={'[C]Primera linea\n[G]Segunda linea'}
        isEditable
        onLyricsChange={onLyricsChange}
      />
    )

    const deleteButtons = screen.getAllByRole('button', { name: 'Eliminar línea' })
    expect(deleteButtons.length).toBeGreaterThan(0)

    await user.click(deleteButtons[0])

    expect(onLyricsChange).toHaveBeenCalledTimes(1)
    const newLyrics = onLyricsChange.mock.calls[0][0] as string
    expect(newLyrics.trim().split('\n').filter(Boolean)).toHaveLength(1)
  })

  it('hides the delete-line button once a single line remains (cannot delete the last line)', () => {
    render(<ChordOverlay lyrics={'[C]Unica linea'} isEditable />)

    expect(screen.queryByRole('button', { name: 'Eliminar línea' })).not.toBeInTheDocument()
  })
})
