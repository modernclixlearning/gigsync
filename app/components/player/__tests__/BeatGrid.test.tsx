import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChordOverlay } from '../ChordOverlay'

function editCells(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-beat-grid-row] > div[style]')).map((el) => ({
    row: el.parentElement!.getAttribute('data-beat-grid-row'),
    gridColumn: el.style.gridColumn,
  }))
}

describe('Chord editor — insert bar after a cell', () => {
  it('inserts an empty bar with the same chord right after the clicked cell', async () => {
    const user = userEvent.setup()
    const onLyricsChange = vi.fn()
    const { container } = render(
      <ChordOverlay lyrics={'[D:4]Hola [G:4]mundo'} isEditable columns={2} onLyricsChange={onLyricsChange} />
    )
    const firstSegment = container.querySelector<HTMLElement>('[data-beat-grid-row] > div[style]')!
    await user.click(within(firstSegment).getByRole('button', { name: 'Insertar compás después' }))
    expect(onLyricsChange).toHaveBeenLastCalledWith('[D:4]Hola [D:4][G:4]mundo')
  })
})

describe('Chord editor — change a chord', () => {
  it('tapping the chord name opens the picker and changes the chord', async () => {
    const user = userEvent.setup()
    const onLyricsChange = vi.fn()
    render(
      <ChordOverlay lyrics={'[D:4]Hola [D:4][G:4]mundo'} isEditable columns={2} onLyricsChange={onLyricsChange} />
    )
    // The blank bar inserted after "Hola" repeats D: change it to A.
    await user.click(screen.getAllByRole('button', { name: 'Cambiar acorde D' })[1])
    await user.click(screen.getByRole('button', { name: 'A' }))
    expect(onLyricsChange).toHaveBeenLastCalledWith('[D:4]Hola [A:4][G:4]mundo')
  })
})

describe('Chord editor — select and merge cells', () => {
  it('shift+click selects a run and "Fusionar" merges it back into one cell', async () => {
    const user = userEvent.setup()
    const onLyricsChange = vi.fn()
    const { container } = render(
      <ChordOverlay
        lyrics={'[D:2]Every [D:2]night [G:4]dreams'}
        isEditable
        columns={2}
        onLyricsChange={onLyricsChange}
      />
    )
    const cell = (i: number) => container.querySelector<HTMLElement>(`[data-chord-index="${i}"]`)!
    await user.click(cell(0))
    expect(screen.queryByRole('button', { name: /Fusionar/ })).toBeNull()
    await user.keyboard('{Shift>}')
    await user.click(cell(1))
    await user.keyboard('{/Shift}')
    await user.click(screen.getByRole('button', { name: 'Fusionar 2 celdas' }))
    expect(onLyricsChange).toHaveBeenLastCalledWith('[D:4]Every night [G:4]dreams')
  })
})

describe('Chord editor — delete selected cells', () => {
  it('deletes a selected run as whole blocks, and never the whole line', async () => {
    const user = userEvent.setup()
    const onLyricsChange = vi.fn()
    const { container } = render(
      <ChordOverlay
        lyrics={'[D:4]Every night [Bm:2]in my [A:2]own [G:4]dreams'}
        isEditable
        columns={2}
        onLyricsChange={onLyricsChange}
      />
    )
    const cell = (i: number) => container.querySelector<HTMLElement>(`[data-chord-index="${i}"]`)!
    // Selecting every cell: delete is disabled (the line keeps one cell).
    await user.click(cell(0))
    await user.keyboard('{Shift>}')
    await user.click(cell(3))
    await user.keyboard('{/Shift}')
    expect(screen.getByRole('button', { name: 'Eliminar 4 celdas' })).toBeDisabled()

    await user.click(cell(1))
    await user.keyboard('{Shift>}')
    await user.click(cell(2))
    await user.keyboard('{/Shift}')
    await user.click(screen.getByRole('button', { name: 'Eliminar 2 celdas' }))
    expect(onLyricsChange).toHaveBeenLastCalledWith('[D:4]Every night [G:4]dreams')
  })
})

describe('Chord editor beat grid', () => {
  it('sizes chords by their playback duration on a fixed 2-bar row', () => {
    // No explicit beats: playback gives the line 2 bars split evenly → 2 beats each.
    const { container } = render(
      <ChordOverlay lyrics={'[C]uno [G]dos [Am]tres [F]cuatro'} isEditable columns={2} gridResolution={0.25} />
    )
    expect(editCells(container)).toEqual([
      { row: '0', gridColumn: '1 / span 8' },
      { row: '0', gridColumn: '9 / span 8' },
      { row: '0', gridColumn: '17 / span 8' },
      { row: '0', gridColumn: '25 / span 8' },
    ])
  })

  it('keeps a short chord short instead of stretching it to the row', () => {
    const { container } = render(<ChordOverlay lyrics={'[C:2]solo'} isEditable columns={2} gridResolution={0.25} />)
    expect(editCells(container)).toEqual([{ row: '0', gridColumn: '1 / span 8' }])
  })

  it('puts bar lines at the same place for every line and follows the time signature', () => {
    const { container } = render(
      <ChordOverlay lyrics={'[C:3]a\n[G:3]b [D:3]c'} isEditable columns={2} timeSignature="3/4" gridResolution={1} />
    )
    const rows = container.querySelectorAll<HTMLElement>('[data-beat-grid-row]')
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row.style.gridTemplateColumns).toBe('repeat(6, minmax(0, 1fr))')
    }
    expect(editCells(container)).toEqual([
      { row: '0', gridColumn: '1 / span 3' },
      { row: '0', gridColumn: '1 / span 3' },
      { row: '0', gridColumn: '4 / span 3' },
    ])
  })
})
