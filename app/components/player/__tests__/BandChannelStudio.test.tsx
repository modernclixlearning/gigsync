import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BandChannelStudio, type BandChannelStudioProps } from '../BandChannelStudio'
import type { SongBand } from '~/lib/audio/bandPatterns'

const setup = (band?: SongBand, monitorEnabled = false) => {
  const props: BandChannelStudioProps = {
    patterns: { band, onChange: vi.fn(), beatsPerBar: 4, defaultDrumPattern: 'rock', onEditTake: vi.fn() },
    tracks: { band, onChange: vi.fn(), onEdit: vi.fn() },
    liveMonitor: {
      enabled: monitorEnabled,
      onToggle: vi.fn(),
      role: 'keys',
      onRoleChange: vi.fn(),
      accessStatus: 'granted',
      inputs: [{ id: 'k', name: 'Minilab3 MIDI' }],
      inputId: 'k',
      onInputChange: vi.fn(),
      voiceLabels: { drums: 'Batería', bass: 'Bajo', keys: 'Piano', lead: 'Saxo', arrangement: 'Cuerdas' },
      held: [],
      lastDrum: null,
    },
  }
  render(<BandChannelStudio {...props} />)
  return { props, user: userEvent.setup() }
}

const channel = (name: string) => within(screen.getByRole('region', { name: `Canal: ${name}` }))

describe('BandChannelStudio', () => {
  it('has a card per channel with the same three tools, and says what each plays in the song', () => {
    setup({
      bassRhythm: 'X...x...x...x...',
      takes: { keys: { notes: [{ beat: 0, beats: 1, pitch: 60, velocity: 0.7 }] } },
      lead: { voice: 'sax', notes: [{ beat: 0, beats: 1, pitch: 72, velocity: 0.7 }] },
    })
    expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual([
      'Canal: Batería',
      'Canal: Bajo',
      'Canal: Acordes',
      'Canal: Melodía',
      'Canal: Arreglos',
    ])
    expect(channel('Batería').getByText('Patrón general')).toBeInTheDocument()
    expect(channel('Bajo').getByText('Ritmo propio')).toBeInTheDocument()
    expect(channel('Acordes').getByText('Toma en vivo · 1 notas')).toBeInTheDocument()
    expect(channel('Melodía').getByText('Saxo · 1 nota')).toBeInTheDocument()
    expect(channel('Arreglos').getByText('Sin escribir')).toBeInTheDocument()
    expect(channel('Batería').getAllByRole('button').map((b) => b.textContent)).toEqual(['Patrón', 'Grabar', 'Tocar'])
    expect(channel('Melodía').getAllByRole('button').map((b) => b.textContent)).toEqual(['Sonido', 'Escribir', 'Tocar'])
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

  it('Sonido opens the written track of that channel', async () => {
    const { user } = setup()
    await user.click(channel('Arreglos').getByRole('button', { name: 'Sonido: Arreglos' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Arreglos' }))
    expect(dialog.getByRole('region', { name: 'Arreglos' })).toBeInTheDocument()
    expect(dialog.queryByRole('region', { name: 'Melodía' })).toBeNull()
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
})
