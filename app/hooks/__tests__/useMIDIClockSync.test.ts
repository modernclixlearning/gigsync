/**
 * Tests for useMIDIClockSync with a mocked navigator.requestMIDIAccess.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMIDIClockSync } from '../useMIDIClockSync'

type Listener = (event: Event) => void

class FakeMIDIInput extends EventTarget {
  state = 'connected'
  open = vi.fn(() => Promise.resolve(this))
  constructor(public id: string, public name: string) {
    super()
  }
  /** Sends a raw MIDI message with an explicit timestamp. */
  send(bytes: number[], timeStamp: number) {
    const event = new Event('midimessage') as Event & { data: Uint8Array }
    Object.defineProperty(event, 'data', { value: new Uint8Array(bytes) })
    Object.defineProperty(event, 'timeStamp', { value: timeStamp })
    this.dispatchEvent(event)
  }
}

class FakeMIDIAccess extends EventTarget {
  inputs = new Map<string, FakeMIDIInput>()
  addInput(input: FakeMIDIInput) {
    this.inputs.set(input.id, input)
    this.dispatchEvent(new Event('statechange'))
  }
}

const TICK_120 = 60000 / (120 * 24)

function sendClock(input: FakeMIDIInput, count: number, intervalMs = TICK_120, startMs = 0) {
  for (let i = 0; i < count; i++) input.send([0xf8], startMs + i * intervalMs)
}

describe('useMIDIClockSync', () => {
  let access: FakeMIDIAccess
  let requestMIDIAccess: ReturnType<typeof vi.fn>
  const originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'requestMIDIAccess')

  beforeEach(() => {
    access = new FakeMIDIAccess()
    requestMIDIAccess = vi.fn(() => Promise.resolve(access))
    Object.defineProperty(navigator, 'requestMIDIAccess', {
      configurable: true,
      writable: true,
      value: requestMIDIAccess,
    })
  })

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(navigator, 'requestMIDIAccess', originalDescriptor)
    } else {
      delete (navigator as unknown as Record<string, unknown>).requestMIDIAccess
    }
  })

  it('is opt-in: does not request MIDI access while disabled', () => {
    const { result } = renderHook(() => useMIDIClockSync({ enabled: false }))
    expect(result.current.status).toBe('disabled')
    expect(result.current.message).toBeNull()
    expect(requestMIDIAccess).not.toHaveBeenCalled()
  })

  it('reports unsupported browsers without throwing', () => {
    delete (navigator as unknown as Record<string, unknown>).requestMIDIAccess
    const { result } = renderHook(() => useMIDIClockSync({ enabled: true }))
    expect(result.current.status).toBe('unsupported')
    expect(result.current.message).toMatch(/Chrome o Edge/)
    expect(result.current.bpm).toBeNull()
  })

  it('reports a denied permission', async () => {
    requestMIDIAccess.mockImplementation(() => Promise.reject(new DOMException('denied', 'SecurityError')))
    const { result } = renderHook(() => useMIDIClockSync({ enabled: true }))
    await waitFor(() => expect(result.current.status).toBe('denied'))
    expect(result.current.message).toMatch(/permiso/)
  })

  it('reports no inputs, then picks up a port connected later (loopMIDI started after the page)', async () => {
    const { result } = renderHook(() => useMIDIClockSync({ enabled: true }))
    await waitFor(() => expect(result.current.status).toBe('no-inputs'))
    expect(requestMIDIAccess).toHaveBeenCalledWith({ sysex: false })

    act(() => access.addInput(new FakeMIDIInput('in-1', 'loopMIDI Port')))
    await waitFor(() => expect(result.current.status).toBe('listening'))
    expect(result.current.activeInputName).toBe('loopMIDI Port')
    expect(result.current.inputs).toEqual([{ id: 'in-1', name: 'loopMIDI Port' }])
  })

  it('reports a saved port that is not connected', async () => {
    access.inputs.set('in-1', new FakeMIDIInput('in-1', 'Other Port'))
    const { result } = renderHook(() =>
      useMIDIClockSync({ enabled: true, inputName: 'loopMIDI Port' })
    )
    await waitFor(() => expect(result.current.status).toBe('input-missing'))
    expect(result.current.message).toMatch(/loopMIDI Port/)
  })

  it('derives BPM from 0xF8 ticks on the selected input only', async () => {
    const other = new FakeMIDIInput('in-1', 'Keyboard')
    const daw = new FakeMIDIInput('in-2', 'loopMIDI Port')
    access.inputs.set(other.id, other)
    access.inputs.set(daw.id, daw)

    const { result } = renderHook(() =>
      useMIDIClockSync({ enabled: true, inputName: 'loopMIDI Port' })
    )
    await waitFor(() => expect(result.current.status).toBe('listening'))
    expect(daw.open).toHaveBeenCalled()

    // Clock on the non-selected input is ignored
    act(() => sendClock(other, 49))
    expect(result.current.bpm).toBeNull()

    act(() => sendClock(daw, 49))
    expect(result.current.bpm).toBeCloseTo(120, 1)
  })

  it('maps Start / Continue / Stop to the callbacks', async () => {
    const daw = new FakeMIDIInput('in-1', 'loopMIDI Port')
    access.inputs.set(daw.id, daw)
    const onStart = vi.fn()
    const onContinue = vi.fn()
    const onStop = vi.fn()

    const { result } = renderHook(() =>
      useMIDIClockSync({ enabled: true, onStart, onContinue, onStop })
    )
    await waitFor(() => expect(result.current.status).toBe('listening'))

    act(() => daw.send([0xfa], 0))
    act(() => daw.send([0xfc], 10))
    act(() => daw.send([0xfb], 20))
    act(() => daw.send([0x90, 60, 100], 30)) // note on: ignored

    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onStop).toHaveBeenCalledTimes(1)
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('stops listening and clears the BPM when disabled', async () => {
    const daw = new FakeMIDIInput('in-1', 'loopMIDI Port')
    access.inputs.set(daw.id, daw)
    const onStart = vi.fn()
    const removeSpy = vi.spyOn(daw, 'removeEventListener')

    const { result, rerender } = renderHook(
      ({ enabled }) => useMIDIClockSync({ enabled, onStart }),
      { initialProps: { enabled: true } }
    )
    await waitFor(() => expect(result.current.status).toBe('listening'))
    act(() => sendClock(daw, 49))
    expect(result.current.bpm).not.toBeNull()

    rerender({ enabled: false })
    expect(result.current.status).toBe('disabled')
    expect(result.current.bpm).toBeNull()
    expect(removeSpy).toHaveBeenCalledWith('midimessage', expect.any(Function) as Listener)

    act(() => daw.send([0xfa], 0))
    expect(onStart).not.toHaveBeenCalled()
  })
})
