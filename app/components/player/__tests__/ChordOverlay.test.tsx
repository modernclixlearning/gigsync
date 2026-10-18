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

describe('ChordOverlay — levare', () => {
  it('marks the words before the first chord so the levare can light them up', () => {
    const { container } = render(<ChordOverlay lyrics={'[^1.5]I [E6]love her [E6]'} />)
    expect(container.querySelector('[data-pickup]')?.textContent?.trim()).toBe('I')
  })

  it('sets the levare length from the chord editor and writes it as [^N]', async () => {
    const user = userEvent.setup()
    const onLyricsChange = vi.fn()
    render(<ChordOverlay lyrics={'I [E6:4]love her [E6:4]'} isEditable columns={2} onLyricsChange={onLyricsChange} />)
    const levare = screen.getByText('Levare').parentElement as HTMLElement
    const [, plus] = levare.querySelectorAll('button')
    await user.click(plus)
    await user.click(plus)
    expect(onLyricsChange).toHaveBeenLastCalledWith('[^0.5]I [E6:4]love her [E6:4]')
  })
})

describe('ChordOverlay — editor stays in sync with the ChordPro text', () => {
  it('editing one chord never re-spells the others (Bb stays Bb in a sharp key)', async () => {
    const user = userEvent.setup()
    const onLyricsChange = vi.fn()
    render(
      <ChordOverlay
        lyrics={'[Bb:4]Hola [G:4]mundo'}
        preferFlats={false}
        isEditable
        columns={2}
        onLyricsChange={onLyricsChange}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Cambiar acorde G' }))
    await user.click(screen.getByRole('button', { name: 'A' }))
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(onLyricsChange).toHaveBeenLastCalledWith('[Bb:4]Hola [A:4]mundo')
  })

  it('editing while transposed saves the song as written, not transposed', async () => {
    const user = userEvent.setup()
    const onLyricsChange = vi.fn()
    render(
      <ChordOverlay
        lyrics={'[D:4]Hola [G:4]mundo'}
        transpose={2}
        isEditable
        columns={2}
        onLyricsChange={onLyricsChange}
      />
    )
    // The editor shows the written chords…
    await user.click(screen.getByRole('button', { name: 'Cambiar acorde G' }))
    await user.click(screen.getByRole('button', { name: 'A' }))
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))
    // …and the untouched D is not saved as the transposed E.
    expect(onLyricsChange).toHaveBeenLastCalledWith('[D:4]Hola [A:4]mundo')
  })

  it('picks up text typed in the ChordPro field, so the next grid edit keeps it', async () => {
    const user = userEvent.setup()
    const onLyricsChange = vi.fn()
    const { rerender } = render(
      <ChordOverlay lyrics={'[D:4]Hola [G:4]mundo'} isEditable columns={2} onLyricsChange={onLyricsChange} />
    )
    // Typed in the text field: G → C7 and new words.
    rerender(
      <ChordOverlay lyrics={'[D:4]Hola [C7:4]amigos'} isEditable columns={2} onLyricsChange={onLyricsChange} />
    )
    expect(screen.getByRole('button', { name: 'Cambiar acorde C7' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cambiar acorde D' }))
    await user.click(screen.getByRole('button', { name: 'E' }))
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(onLyricsChange).toHaveBeenLastCalledWith('[E:4]Hola [C7:4]amigos')
  })
})

describe('ChordOverlay — syncopated instrumental chords', () => {
  // E until the "and" of 3, E/F# until the "and" of 4, E/G# pushed onto the
  // "and" of 4 and tied over bar 2; then A, A/B, A/C# across bars 3–4.
  const INTRO = '[Intro]\nE 2.5 | E/F# 1 | E/G# 4.5 |\nA 3.5 | A/B 2.5 | A/C# 2 |'

  it('places each chord at the beat it starts on, two bars per row', () => {
    const { container } = render(<ChordOverlay lyrics={INTRO} columns={2} />)
    const columnOf = (i: number) =>
      container.querySelector<HTMLElement>(`[data-chord-index="${i}"]`)!.style.gridColumn
    // 16th-note units: a row of 2 bars is 32 units.
    expect([0, 1, 2, 3, 4, 5].map(columnOf)).toEqual([
      '1 / span 10',
      '11 / span 4',
      '15 / span 18',
      '1 / span 14',
      '15 / span 10',
      '25 / span 8',
    ])
  })

  it('counts the bars the chords fill, not the number of chords', () => {
    render(<ChordOverlay lyrics={INTRO} columns={2} />)
    expect(screen.getByText(/4\s+compases/)).toBeInTheDocument()
  })

  it('shows a chord tied across a row break as a continuation', () => {
    const { container } = render(<ChordOverlay lyrics={INTRO} columns={1} />)
    const pieces = container.querySelectorAll('[data-chord-index="2"]')
    expect(Array.from(pieces).map((el) => el.textContent)).toEqual(['E/G#', '↳'])
  })
})

describe('ChordOverlay — homogeneous chords and song alignment', () => {
  const SONG = '[Intro | 2 bars]\nF#m | E6 |\n\n[F#m]I give her [C#m]all my love\n\nA | D |'

  it('instrumental and chords-only chords use the same color as the lyric chords', () => {
    const { container } = render(<ChordOverlay lyrics={SONG} />)
    const labels = Array.from(container.querySelectorAll<HTMLElement>('.gs-chord'))
    expect(labels.length).toBeGreaterThanOrEqual(6)
    for (const label of labels) {
      expect(label.className).toContain('text-sky-400/70')
      expect(label.className).not.toMatch(/emerald|amber|indigo/)
    }
  })

  it('aligns instrumental bars and chords-only lines with the song', () => {
    const { container, rerender } = render(<ChordOverlay lyrics={SONG} textAlign="left" />)
    const bar = () => container.querySelector<HTMLElement>('[data-chord-index="0"]')!
    expect(bar().className).toContain('items-start')

    rerender(<ChordOverlay lyrics={SONG} textAlign="right" />)
    expect(bar().className).toContain('items-end')
    const chordsOnlyRow = Array.from(container.querySelectorAll<HTMLElement>('.flex-wrap')).find((el) =>
      el.querySelector('.gs-chord')
    )
    expect(chordsOnlyRow?.className).toContain('justify-end')
  })
})
