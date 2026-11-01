import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlayerSoundSettings, type PlayerSoundSettingsProps } from '../PlayerSoundSettings'

const props = (overrides: Partial<PlayerSoundSettingsProps> = {}): PlayerSoundSettingsProps => ({
  metronome: { enabled: false, onToggle: vi.fn(), volume: 60, onVolumeChange: vi.fn() },
  chords: { enabled: false, onToggle: vi.fn(), volume: 50, onVolumeChange: vi.fn() },
  countIn: { enabled: false, onToggle: vi.fn(), bars: 1, onBarsChange: vi.fn() },
  transpose: {
    transpose: 0,
    onTranspose: vi.fn(),
    onResetTranspose: vi.fn(),
    transposeDisplay: 'C',
    transposePreferFlats: false,
    isTransposeSpellingFlexible: false,
    onToggleTransposeSpelling: vi.fn(),
    onSaveTranspose: vi.fn(),
    canSaveForSetlist: false,
  },
  setlist: { autoAdvance: false, onAutoAdvanceChange: vi.fn(), delaySeconds: 15, onDelaySecondsChange: vi.fn() },
  ...overrides,
})

describe('PlayerSoundSettings', () => {
  it('turns the click and the chords on and sets each volume on its own', async () => {
    const user = userEvent.setup()
    const metronome = { enabled: false, onToggle: vi.fn(), volume: 60, onVolumeChange: vi.fn() }
    const chords = { enabled: true, onToggle: vi.fn(), volume: 50, onVolumeChange: vi.fn() }
    render(<PlayerSoundSettings {...props({ metronome, chords })} />)

    expect(screen.getByRole('switch', { name: 'Metrónomo' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('switch', { name: 'Acordes' })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('switch', { name: 'Metrónomo' }))
    expect(metronome.onToggle).toHaveBeenCalledTimes(1)

    const chordVolume = screen.getByRole('slider', { name: 'Volumen: acordes' })
    expect(chordVolume).toHaveValue('50')
    fireEvent.change(chordVolume, { target: { value: '25' } })
    expect(chords.onVolumeChange).toHaveBeenCalledWith(25)
    expect(metronome.onVolumeChange).not.toHaveBeenCalled()

    fireEvent.change(screen.getByRole('slider', { name: 'Volumen: metrónomo' }), { target: { value: '80' } })
    expect(metronome.onVolumeChange).toHaveBeenCalledWith(80)
  })

  it('says why nothing sounds when it cannot', () => {
    const { rerender } = render(<PlayerSoundSettings {...props()} />)
    expect(screen.queryByText(/suenan con el scroll/)).toBeNull()
    rerender(<PlayerSoundSettings {...props({ soundUnavailableReason: 'El metrónomo y los acordes suenan con el scroll activado.' })} />)
    expect(screen.getByText(/suenan con el scroll/)).toBeInTheDocument()
  })

  it('has the count-in, the transpose and the setlist in their own sections', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<PlayerSoundSettings {...p} />)

    await user.click(within(screen.getByRole('region', { name: 'Precuenta' })).getByRole('switch'))
    expect(p.countIn.onToggle).toHaveBeenCalledTimes(1)

    await user.click(within(screen.getByRole('region', { name: 'Tono' })).getByRole('button', { name: 'Subir un semitono' }))
    expect(p.transpose.onTranspose).toHaveBeenCalledWith(1)

    const setlist = screen.getByRole('region', { name: 'Setlist' })
    await user.click(within(setlist).getByRole('switch', { name: 'Avanzar solo' }))
    expect(p.setlist.onAutoAdvanceChange).toHaveBeenCalledWith(true)
  })
})
