import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSpaceToPlay } from '../useSpaceToPlay'

function press(target: EventTarget, init: KeyboardEventInit = {}) {
  const down = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true, ...init })
  const up = new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(down)
  target.dispatchEvent(up)
  return { down, up }
}

describe('useSpaceToPlay', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('toggles play/pause on the space bar and keeps the page from scrolling', () => {
    const onToggle = vi.fn()
    renderHook(() => useSpaceToPlay({ enabled: true, onToggle }))
    const { down, up } = press(document.body)
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(down.defaultPrevented).toBe(true)
    expect(up.defaultPrevented).toBe(true)
  })

  it('does not also activate the focused button', () => {
    const onToggle = vi.fn()
    const button = document.createElement('button')
    document.body.appendChild(button)
    renderHook(() => useSpaceToPlay({ enabled: true, onToggle }))
    const { down, up } = press(button)
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(down.defaultPrevented && up.defaultPrevented).toBe(true)
  })

  it('leaves the space alone while typing', () => {
    const onToggle = vi.fn()
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    document.body.append(input, textarea)
    renderHook(() => useSpaceToPlay({ enabled: true, onToggle }))
    expect(press(input).down.defaultPrevented).toBe(false)
    expect(press(textarea).down.defaultPrevented).toBe(false)
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('ignores key repeats, modifiers and other keys', () => {
    const onToggle = vi.fn()
    renderHook(() => useSpaceToPlay({ enabled: true, onToggle }))
    press(document.body, { repeat: true })
    press(document.body, { shiftKey: true })
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', bubbles: true }))
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('does nothing while disabled (chord edit mode)', () => {
    const onToggle = vi.fn()
    renderHook(() => useSpaceToPlay({ enabled: false, onToggle }))
    expect(press(document.body).down.defaultPrevented).toBe(false)
    expect(onToggle).not.toHaveBeenCalled()
  })
})
