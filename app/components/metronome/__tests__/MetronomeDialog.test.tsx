import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clocks } from '@tests/mocks/tone'

vi.mock('tone', async () => {
  const mockToneModule = await import('@tests/mocks/tone')
  return mockToneModule.default
})

import { MetronomeDialog } from '../MetronomeDialog'

describe('MetronomeDialog', () => {
  beforeEach(() => {
    clocks.length = 0
  })

  it('opens as a modal over the song, at the song\'s tempo and meter', () => {
    render(<MetronomeDialog bpm={96} timeSignature="6/8" onClose={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: 'Metrónomo' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('slider', { name: 'Tempo' })).toHaveAttribute('aria-valuenow', '96')
    expect(screen.getByRole('button', { name: 'Compás de 6/8' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Compás de 4/4' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('rounds a tempo that comes from a DAW clock and keeps it in range', () => {
    const { unmount } = render(<MetronomeDialog bpm={97.6} timeSignature="4/4" onClose={vi.fn()} />)
    expect(screen.getByRole('slider', { name: 'Tempo' })).toHaveAttribute('aria-valuenow', '98')
    unmount()
    render(<MetronomeDialog bpm={999} timeSignature="4/4" onClose={vi.fn()} />)
    expect(screen.getByRole('slider', { name: 'Tempo' })).toHaveAttribute('aria-valuenow', '300')
  })

  it('starts and stops the click on its own clock', async () => {
    const user = userEvent.setup()
    render(<MetronomeDialog bpm={100} timeSignature="4/4" onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Iniciar metrónomo' }))
    expect(clocks).toHaveLength(1)
    expect(clocks[0].frequency.value).toBeCloseTo(100 / 60)
    expect(screen.getByRole('button', { name: 'Detener metrónomo' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Detener metrónomo' }))
    expect(clocks[0].stop).toHaveBeenCalled()
  })

  it('turning the knob while it plays changes the tempo of the clock', async () => {
    const user = userEvent.setup()
    render(<MetronomeDialog bpm={100} timeSignature="4/4" onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Iniciar metrónomo' }))
    const slider = screen.getByRole('slider', { name: 'Tempo' })
    slider.focus()
    await user.keyboard('{Shift>}{ArrowUp}{/Shift}')
    expect(slider).toHaveAttribute('aria-valuenow', '110')
    expect(clocks[clocks.length - 1].frequency.value).toBeCloseTo(110 / 60)
  })

  it('offers to go back to the song\'s tempo once it was changed', async () => {
    const user = userEvent.setup()
    render(<MetronomeDialog bpm={100} timeSignature="4/4" onClose={vi.fn()} />)
    expect(screen.queryByTitle('Volver al tempo con el que se abrió')).toBeNull()
    screen.getByRole('slider', { name: 'Tempo' }).focus()
    await user.keyboard('{ArrowUp}{ArrowUp}')
    await user.click(screen.getByTitle('Volver al tempo con el que se abrió'))
    expect(screen.getByRole('slider', { name: 'Tempo' })).toHaveAttribute('aria-valuenow', '100')
  })

  it('keeps sound and settings folded away, and goes back to the song with the button or Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<MetronomeDialog bpm={100} timeSignature="4/4" onClose={onClose} />)
    expect(screen.getByText('Sonido y ajustes')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Volver a la canción' }))
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('stops the click when it closes', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<MetronomeDialog bpm={100} timeSignature="4/4" onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Iniciar metrónomo' }))
    await act(async () => unmount())
    expect(clocks[0].stop).toHaveBeenCalled()
    expect(clocks[0].dispose).toHaveBeenCalled()
  })
})
