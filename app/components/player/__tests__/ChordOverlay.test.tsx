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

describe('ChordOverlay — chord font size', () => {
  it('applies "Tamaño de acordes" to instrumental sections like it does to lyric lines', () => {
    render(<ChordOverlay lyrics={'[Intro | 2 bars]\nF#m | E6 |\n\n[F#m]I give her all my love'} chordFontSize={40} />)
    expect(screen.getByText('E6')).toHaveStyle({ fontSize: '40px' })
    expect(screen.getAllByText('F#m').every((el) => el.style.fontSize === '40px')).toBe(true)
  })

  it('applies it in the chord editor of an instrumental section too', () => {
    render(<ChordOverlay lyrics={'[Intro | 2 bars]\nF#m | E6 |'} chordFontSize={40} isEditable columns={2} />)
    expect(screen.getByRole('button', { name: 'Cambiar acorde E6' })).toHaveStyle({ fontSize: '40px' })
  })
})

describe('ChordOverlay — chord colors', () => {
  it('marks every chord label in read mode so "Colores de acordes" reaches all of them', () => {
    const { container } = render(
      <ChordOverlay lyrics={'[Intro | 2 bars]\nF#m | E6 |\n\n[F#m]I give her all my love'} />
    )
    const labels = Array.from(container.querySelectorAll('.gs-chord')).map((el) => el.textContent)
    expect(labels).toEqual(expect.arrayContaining(['F#m', 'E6']))
    expect(labels.filter((l) => l === 'F#m')).toHaveLength(2)
  })
})

describe('ChordOverlay — text before the first chord', () => {
  it('shows the words sung before the first chord of a line', () => {
    const { container } = render(<ChordOverlay lyrics={"[A] You'd love her  [B] too\nI [E6] love her [E6]"} />)
    const rows = Array.from(container.querySelectorAll('[data-element-id]')).map((el) => el.textContent)
    expect(rows.some((t) => /^I\s+E6\s*love her/.test(t ?? ''))).toBe(true)
  })

  it('keeps the beat highlight indices on the chord cells, not on that text', () => {
    const { container } = render(<ChordOverlay lyrics={'I [E6] love her [E6]'} />)
    const cells = Array.from(container.querySelectorAll('[data-chord-index]')).map((el) => el.getAttribute('data-chord-index'))
    expect(cells).toEqual(['0', '1'])
  })

  it('shows a sung line that has no chords at all', () => {
    render(<ChordOverlay lyrics={'[A]Hola\nsolo letra'} />)
    expect(screen.getByText('solo letra')).toBeInTheDocument()
  })
})
