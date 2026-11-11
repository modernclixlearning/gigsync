import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BandPatternEditor } from '../BandPatternEditor'
import type { SongBand } from '~/lib/audio/bandPatterns'

const setup = (band?: SongBand, beatsPerBar = 4) => {
  const onChange = vi.fn()
  render(<BandPatternEditor band={band} onChange={onChange} beatsPerBar={beatsPerBar} defaultDrumPattern="rock" />)
  return { onChange, user: userEvent.setup() }
}

const steps = (lane: string) => within(screen.getByRole('group', { name: lane })).getAllByRole('button')
const pressed = (lane: string) => steps(lane).map((step) => (step.getAttribute('aria-pressed') === 'true' ? 'x' : '.')).join('')

describe('BandPatternEditor', () => {
  it('shows the built-in drum pattern while the song has none, and the first tap makes it the song\'s own', async () => {
    const { user, onChange } = setup()
    expect(within(screen.getByRole('region', { name: 'Batería' })).getByText(/Suena el patrón general \(Rock\)/)).toBeInTheDocument()
    expect(pressed('Bombo')).toBe('x.......x.x.....')

    await user.click(steps('Bombo')[4])
    expect(onChange).toHaveBeenLastCalledWith({
      drums: { kick: 'X...x...X.X.....', snare: '....X.......X...', hat: 'X.x.x.x.x.x.x.x.' },
    })
  })

  it('a tap on a step of the song pattern cycles it and saves the whole band', async () => {
    const band: SongBand = { drums: { kick: 'X...............', snare: '....X...........', hat: '................' }, bassRhythm: 'X...x...x...x...' }
    const { user, onChange } = setup(band)
    await user.click(steps('Bombo')[0]) // accent → rest
    expect(onChange).toHaveBeenLastCalledWith({
      drums: { kick: '................', snare: '....X...........', hat: '................' },
      bassRhythm: 'X...x...x...x...',
    })
  })

  it('starts from a template and can be two bars long', async () => {
    const { user, onChange } = setup()
    await user.click(screen.getByRole('button', { name: 'Bossa nova' }))
    expect(onChange.mock.calls.at(-1)![0].drums.snare).toHaveLength(32)

    await user.click(screen.getByRole('radio', { name: '2 compases' }))
    expect(onChange.mock.calls.at(-1)![0].drums.kick).toBe('X.......X.X.....' + 'X.......X.X.....')
  })

  it('removes the song\'s own drum pattern', async () => {
    const { user, onChange } = setup({ drums: { kick: 'X...', snare: '', hat: '' }, chordRhythm: 'X...x...x...x...' })
    await user.click(screen.getByRole('button', { name: 'Quitar el patrón propio de batería' }))
    expect(onChange).toHaveBeenLastCalledWith({ chordRhythm: 'X...x...x...x...' })
  })

  it('bass: picks a rhythm, edits it by hand and goes back to the long note', async () => {
    const { user, onChange } = setup()
    const bass = within(screen.getByRole('region', { name: 'Bajo' }))
    expect(bass.getByRole('radio', { name: 'Nota larga' })).toHaveAttribute('aria-checked', 'true')

    await user.click(bass.getByRole('radio', { name: 'Negras' }))
    expect(onChange).toHaveBeenLastCalledWith({ bassRhythm: 'X...x...x...x...' })

    await user.click(steps('Ritmo del bajo')[2])
    expect(onChange).toHaveBeenLastCalledWith({ bassRhythm: '..x.............' })
  })

  it('clearing the last hit of a rhythm leaves the song without it', async () => {
    const { user, onChange } = setup({ chordRhythm: 'x...............' })
    await user.click(steps('Ritmo de los acordes')[0]) // normal → accent
    expect(onChange).toHaveBeenLastCalledWith({ chordRhythm: 'X...............' })
  })

  it('draws as many steps as the meter has: twelve in 3/4', () => {
    setup({ bassRhythm: 'X...x...x...' }, 3)
    expect(steps('Ritmo del bajo')).toHaveLength(12)
    expect(within(screen.getByRole('region', { name: 'Bajo' })).getByRole('radio', { name: 'Negras' })).toHaveAttribute('aria-checked', 'true')
  })
})
