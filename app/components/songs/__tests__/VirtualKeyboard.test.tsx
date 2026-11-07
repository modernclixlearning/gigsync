import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VirtualKeyboard } from '../VirtualKeyboard'

// jsdom has no PointerEvent: without it `pointerId` is lost and every finger looks like the same one.
if (typeof window.PointerEvent === 'undefined') {
  class TestPointerEvent extends MouseEvent {
    pointerId: number
    constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
    }
  }
  Object.defineProperty(window, 'PointerEvent', { configurable: true, value: TestPointerEvent })
}

const setup = (held: number[] = []) => {
  const onNoteOn = vi.fn()
  const onNoteOff = vi.fn()
  const view = render(<VirtualKeyboard held={held} onNoteOn={onNoteOn} onNoteOff={onNoteOff} />)
  return { onNoteOn, onNoteOff, ...view }
}

describe('VirtualKeyboard', () => {
  it('shows two octaves, 24 keys, starting at C3 and C4', () => {
    setup()
    const lower = screen.getByRole('group', { name: 'Octava 3' })
    const upper = screen.getByRole('group', { name: 'Octava 4' })
    expect(within(lower).getAllByRole('button')).toHaveLength(12)
    expect(within(upper).getAllByRole('button')).toHaveLength(12)
    expect(within(lower).getByRole('button', { name: 'C3' })).toBeInTheDocument()
    expect(within(upper).getByRole('button', { name: 'F#4' })).toBeInTheDocument()
  })

  it('lays the octaves out side by side on a wide screen and stacked (upper on top) on a phone', () => {
    setup()
    const container = screen.getByRole('group', { name: 'Octava 3' }).parentElement as HTMLElement
    // Lower octave is first in the DOM: left on `md:flex-row`, bottom on `flex-col-reverse`.
    expect(container.className).toContain('flex-col-reverse')
    expect(container.className).toContain('md:flex-row')
    expect(container.firstElementChild).toBe(screen.getByRole('group', { name: 'Octava 3' }))
  })

  it('a finger down plays the note and up releases it; several fingers play at once', () => {
    const { onNoteOn, onNoteOff } = setup()
    const c = screen.getByRole('button', { name: 'C3' })
    const e = screen.getByRole('button', { name: 'E3' })
    fireEvent.pointerDown(c, { pointerId: 1, clientY: 100 })
    fireEvent.pointerDown(e, { pointerId: 2, clientY: 100 })
    expect(onNoteOn).toHaveBeenNthCalledWith(1, 48, expect.any(Number))
    expect(onNoteOn).toHaveBeenNthCalledWith(2, 52, expect.any(Number))
    fireEvent.pointerUp(c, { pointerId: 1 })
    expect(onNoteOff).toHaveBeenCalledWith(48)
    expect(onNoteOff).not.toHaveBeenCalledWith(52)
    fireEvent.pointerCancel(e, { pointerId: 2 })
    expect(onNoteOff).toHaveBeenCalledWith(52)
  })

  it('a pointer that was never down releases nothing', () => {
    const { onNoteOff } = setup()
    fireEvent.pointerUp(screen.getByRole('button', { name: 'C3' }), { pointerId: 9 })
    expect(onNoteOff).not.toHaveBeenCalled()
  })

  it('lights the keys that are sounding, from any source', () => {
    setup([48, 52, 55])
    expect(screen.getByRole('button', { name: 'C3' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'G3' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'D3' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('plays with the computer keys: Z row lower octave, Q row upper', () => {
    const { onNoteOn, onNoteOff } = setup()
    fireEvent.keyDown(window, { code: 'KeyZ' })
    fireEvent.keyDown(window, { code: 'KeyQ' })
    expect(onNoteOn).toHaveBeenNthCalledWith(1, 48, 90)
    expect(onNoteOn).toHaveBeenNthCalledWith(2, 60, 90)
    fireEvent.keyUp(window, { code: 'KeyZ' })
    expect(onNoteOff).toHaveBeenCalledWith(48)
  })

  it('ignores key repeat, other keys, shortcuts and typing in a field', () => {
    const { onNoteOn } = setup()
    fireEvent.keyDown(window, { code: 'KeyZ' })
    fireEvent.keyDown(window, { code: 'KeyZ', repeat: true })
    expect(onNoteOn).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(window, { code: 'Space' })
    fireEvent.keyDown(window, { code: 'KeyX', ctrlKey: true })
    expect(onNoteOn).toHaveBeenCalledTimes(1)
    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { code: 'KeyC', bubbles: true })
    expect(onNoteOn).toHaveBeenCalledTimes(1)
    input.remove()
  })

  it('changes octave with the arrow buttons and the - = keys, releasing what was held', async () => {
    const user = userEvent.setup()
    const { onNoteOn, onNoteOff } = setup()
    fireEvent.keyDown(window, { code: 'KeyZ' })
    await user.click(screen.getByRole('button', { name: 'Octava más aguda' }))
    expect(onNoteOff).toHaveBeenCalledWith(48)
    expect(screen.getByText('Oct 4')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Octava 5' })).toBeInTheDocument()
    fireEvent.keyDown(window, { code: 'KeyZ' })
    expect(onNoteOn).toHaveBeenLastCalledWith(60, 90)
    fireEvent.keyDown(window, { code: 'Minus' })
    fireEvent.keyDown(window, { code: 'Minus' })
    expect(screen.getByText('Oct 2')).toBeInTheDocument()
  })

  it('stops at the ends of the range', async () => {
    const user = userEvent.setup()
    setup()
    for (let i = 0; i < 6; i++) fireEvent.keyDown(window, { code: 'Minus' })
    expect(screen.getByText('Oct 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Octava más grave' })).toBeDisabled()
    for (let i = 0; i < 9; i++) fireEvent.keyDown(window, { code: 'Equal' })
    expect(screen.getByText('Oct 6')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Octava más aguda' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Octava más grave' }))
    expect(screen.getByText('Oct 5')).toBeInTheDocument()
  })

  it('releases held notes when it goes away', () => {
    const { onNoteOff, unmount } = setup()
    fireEvent.keyDown(window, { code: 'KeyC' })
    unmount()
    expect(onNoteOff).toHaveBeenCalledWith(52)
  })
})
