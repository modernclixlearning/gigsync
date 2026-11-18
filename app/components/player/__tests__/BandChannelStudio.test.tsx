import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BandChannelStudio, type BandChannelStudioProps } from '../BandChannelStudio'
import type { SongBand } from '~/lib/audio/bandPatterns'

const source = (volume: number, enabled = true) => ({ enabled, onToggle: vi.fn(), volume, onVolumeChange: vi.fn() })

const make = (band?: SongBand, monitorEnabled = false) => {
  const props = {
    metronome: source(60, false),
    chords: source(50),
    bass: { ...source(70), voice: 'electric' as const, onVoiceChange: vi.fn() },
    drums: { ...source(40), pattern: 'rock' as const, onPatternChange: vi.fn() },
    patterns: { band, onChange: vi.fn(), beatsPerBar: 4, defaultDrumPattern: 'rock' as const, onEditTake: vi.fn() },
    tracks: { band, onChange: vi.fn(), onEdit: vi.fn() },
    liveMonitor: {
      enabled: monitorEnabled,
      onToggle: vi.fn(),
      role: 'keys' as const,
      onRoleChange: vi.fn(),
      accessStatus: 'granted' as const,
      inputs: [{ id: 'k', name: 'Minilab3 MIDI' }],
      inputId: 'k',
      onInputChange: vi.fn(),
      voiceLabels: { drums: 'Batería', bass: 'Bajo', keys: 'Piano', lead: 'Saxo', arrangement: 'Cuerdas' },
      held: [],
      lastDrum: null,
    },
  }
  return props
}
type Props = ReturnType<typeof make>

const setup = (band?: SongBand, monitorEnabled = false, props: Props = make(band, monitorEnabled)) => {
  render(<BandChannelStudio {...(props as BandChannelStudioProps)} />)
  return { props, user: userEvent.setup() }
}

const channel = (name: string) => within(screen.getByRole('region', { name: `Canal: ${name}` }))
const note = { beat: 0, beats: 1, pitch: 72, velocity: 0.7 }

describe('BandChannelStudio', () => {
  it('has one card per channel, the click included', () => {
    setup()
    expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual([
      'Canal: Metrónomo',
      'Canal: Batería',
      'Canal: Bajo',
      'Canal: Acordes',
      'Canal: Melodía',
      'Canal: Arreglos',
    ])
  })

  it('puts the switch and the volume of each channel in its own card', async () => {
    const { props, user } = setup()
    expect(channel('Metrónomo').getByRole('switch', { name: 'Metrónomo' })).toHaveAttribute('aria-checked', 'false')
    expect(channel('Acordes').getByRole('slider', { name: 'Volumen: acordes' })).toHaveValue('50')

    await user.click(channel('Bajo').getByRole('switch', { name: 'Bajo' }))
    expect(props.bass.onToggle).toHaveBeenCalledTimes(1)
    fireEvent.change(channel('Batería').getByRole('slider', { name: 'Volumen: batería' }), { target: { value: '25' } })
    expect(props.drums.onVolumeChange).toHaveBeenCalledWith(25)
    expect(props.chords.onVolumeChange).not.toHaveBeenCalled()
  })

  it('keeps the sound choices inside their cards: the bass voice and the drum pattern', async () => {
    const { props, user } = setup()
    await user.click(channel('Bajo').getByRole('radio', { name: 'Contrabajo' }))
    expect(props.bass.onVoiceChange).toHaveBeenCalledWith('upright')
    await user.click(channel('Batería').getByRole('radio', { name: 'Bossa nova' }))
    expect(props.drums.onPatternChange).toHaveBeenCalledWith('bossa')
  })

  it('says what each channel plays in the song and has the same tools on all of them', () => {
    setup({
      bassRhythm: 'X...x...x...x...',
      takes: { keys: { notes: [note] } },
      lead: { voice: 'sax', notes: [note, { ...note, beat: 2 }] },
    })
    expect(channel('Batería').getByText('Patrón general')).toBeInTheDocument()
    expect(channel('Bajo').getByText('Ritmo propio')).toBeInTheDocument()
    expect(channel('Acordes').getByText('Toma en vivo · 1 notas')).toBeInTheDocument()
    expect(channel('Melodía').getByText('2 notas')).toBeInTheDocument()
    expect(channel('Arreglos').getByText('Sin escribir')).toBeInTheDocument()
    expect(channel('Batería').getAllByRole('button').filter((b) => !b.closest('[role=radiogroup]') && b.getAttribute('role') !== 'switch').map((b) => b.textContent)).toEqual([
      'Patrón',
      'Grabar',
      'Tocar',
    ])
    expect(channel('Melodía').getByRole('button', { name: 'Escribir: Melodía' })).toBeInTheDocument()
    expect(channel('Melodía').queryByRole('button', { name: /Patrón/ })).toBeNull()
    expect(channel('Metrónomo').queryByRole('button', { name: /Tocar|Grabar|Patrón/ })).toBeNull()
  })

  it('a written track: its voice is chosen in the card, its switch mutes it, its slider sets its level', async () => {
    const band: SongBand = { lead: { voice: 'sax', notes: [note] } }
    const { props, user } = setup(band)
    const lead = channel('Melodía')
    expect(lead.getByRole('radio', { name: 'Saxo' })).toHaveAttribute('aria-checked', 'true')

    await user.click(lead.getByRole('radio', { name: 'Guitarra eléctrica' }))
    expect(props.tracks.onChange).toHaveBeenLastCalledWith({ lead: { voice: 'guitar', notes: [note] } })
    await user.click(lead.getByRole('switch', { name: 'Melodía' }))
    expect(props.tracks.onChange).toHaveBeenLastCalledWith({ lead: { voice: 'sax', notes: [note], muted: true } })
    fireEvent.change(lead.getByRole('slider', { name: 'Volumen: melodía' }), { target: { value: '35' } })
    expect(props.tracks.onChange).toHaveBeenLastCalledWith({ lead: { voice: 'sax', notes: [note], volume: 35 } })
  })

  it('an empty track can be given a sound but not muted', async () => {
    const { props, user } = setup()
    const arrangement = channel('Arreglos')
    expect(arrangement.getByRole('switch', { name: 'Arreglos' })).toHaveAttribute('aria-checked', 'false')
    await user.click(arrangement.getByRole('switch', { name: 'Arreglos' }))
    expect(props.tracks.onChange).not.toHaveBeenCalled()
    await user.click(arrangement.getByRole('radio', { name: 'Coro' }))
    expect(props.tracks.onChange).toHaveBeenLastCalledWith({ arrangement: { voice: 'choir', notes: [] } })
  })

  it('Patrón opens a modal with only that channel\'s pattern', async () => {
    const { user } = setup()
    await user.click(channel('Bajo').getByRole('button', { name: 'Patrón: Bajo' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Bajo' }))
    expect(dialog.getByRole('region', { name: 'Bajo' })).toBeInTheDocument()
    expect(dialog.queryByRole('region', { name: 'Batería' })).toBeNull()
    expect(dialog.queryByRole('region', { name: 'Acordes' })).toBeNull()

    await user.click(dialog.getByRole('button', { name: 'Listo' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Grabar and Escribir go straight to the editor, no modal', async () => {
    const { user, props } = setup()
    await user.click(channel('Batería').getByRole('button', { name: 'Grabar: Batería' }))
    await user.click(channel('Melodía').getByRole('button', { name: 'Escribir: Melodía' }))
    expect(props.patterns.onEditTake).toHaveBeenCalledWith('drums')
    expect(props.tracks.onEdit).toHaveBeenCalledWith('lead')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Tocar puts the keys on that channel, turns the monitor on and opens it', async () => {
    const { user, props } = setup()
    await user.click(channel('Melodía').getByRole('button', { name: 'Tocar: Melodía' }))
    expect(props.liveMonitor.onRoleChange).toHaveBeenCalledWith('lead')
    expect(props.liveMonitor.onToggle).toHaveBeenCalledTimes(1)
    expect(within(screen.getByRole('dialog', { name: 'Tocar: Melodía' })).getByRole('region', { name: 'Tocar con el controlador' })).toBeInTheDocument()
  })

  it('does not switch the monitor off when it was already on', async () => {
    const { user, props } = setup(undefined, true)
    await user.click(channel('Bajo').getByRole('button', { name: 'Tocar: Bajo' }))
    expect(props.liveMonitor.onRoleChange).toHaveBeenCalledWith('bass')
    expect(props.liveMonitor.onToggle).not.toHaveBeenCalled()
  })

  it('shows only the mixer of each channel when it has no song tools to offer', () => {
    const { bass, drums, patterns, tracks, liveMonitor, ...bare } = make()
    void bass
    void drums
    void patterns
    void tracks
    void liveMonitor
    render(<BandChannelStudio {...bare} />)
    expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual(['Canal: Metrónomo', 'Canal: Acordes'])
    expect(screen.queryByRole('button', { name: /Patrón|Grabar|Tocar|Escribir/ })).toBeNull()
  })
})
