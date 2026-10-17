import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { AutoAdvanceBanner } from '../AutoAdvanceBanner'

describe('AutoAdvanceBanner', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('counts down the pause and then advances once', () => {
    const onAdvance = vi.fn()
    render(<AutoAdvanceBanner nextTitle="Wonderwall" delaySeconds={3} onAdvance={onAdvance} onCancel={vi.fn()} />)
    expect(screen.getByText('Wonderwall')).toBeInTheDocument()
    expect(screen.getByText('Empieza en 3 s')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByText('Empieza en 1 s')).toBeInTheDocument()
    expect(onAdvance).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1000))
    expect(onAdvance).toHaveBeenCalledTimes(1)
  })

  it('"Ya" skips the wait and the close button cancels', () => {
    const onAdvance = vi.fn()
    const onCancel = vi.fn()
    render(<AutoAdvanceBanner nextTitle="Wonderwall" delaySeconds={15} onAdvance={onAdvance} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: /Ya/ }))
    expect(onAdvance).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar avance automático' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
