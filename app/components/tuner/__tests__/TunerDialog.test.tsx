import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const tuner = vi.hoisted(() => ({
  state: {
    isListening: true,
    isRequesting: false,
    hasPermission: true,
    error: null as string | null,
    pitch: { frequency: 441.5, note: 'A', octave: 4, cents: 6, confidence: 0.97 } as null | {
      frequency: number
      note: string
      octave: number
      cents: number
      confidence: number
    },
    calibration: { referenceFrequency: 440, sensitivity: 0.5 },
    preset: null,
    start: vi.fn(async () => undefined),
    stop: vi.fn(),
    toggle: vi.fn(),
    setCalibration: vi.fn(),
    setPreset: vi.fn(),
  },
}))

vi.mock('~/hooks/useTuner', () => ({ useTuner: () => tuner.state }))

import { TunerDialog } from '../TunerDialog'

describe('TunerDialog', () => {
  beforeEach(() => {
    tuner.state.isListening = true
    tuner.state.error = null
    tuner.state.start.mockClear()
  })

  it('opens the tuner as a modal over the song and asks for the microphone right away', () => {
    render(<TunerDialog onClose={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: 'Afinador' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Escuchando')
    expect(tuner.state.start).toHaveBeenCalledTimes(1)
  })

  it('shows what is heard: the note, with the needle and the dial to choose from', async () => {
    const user = userEvent.setup()
    render(<TunerDialog onClose={vi.fn()} />)
    expect(screen.getAllByText('A').length).toBeGreaterThan(0)
    expect(screen.getByText(/441.50/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aguja' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Rueda' }))
    expect(screen.getByRole('button', { name: 'Rueda' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps the tunings at hand and folds the calibration away', () => {
    render(<TunerDialog onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Cromático' })).toBeInTheDocument()
    expect(screen.getByText(/Calibración · A4 = 440 Hz/)).toBeInTheDocument()
  })

  it('goes back to the song with the button, with Escape, or with a tap outside', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<TunerDialog onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Volver a la canción' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('says what to do when the microphone is not available', async () => {
    tuner.state.isListening = false
    tuner.state.error = 'Permiso denegado'
    render(<TunerDialog onClose={vi.fn()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Permiso denegado')
    expect(screen.getByRole('button', { name: /Activar micrófono/ })).toBeInTheDocument()
  })
})
