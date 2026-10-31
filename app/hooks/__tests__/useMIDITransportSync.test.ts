/**
 * Tests for useMIDITransportSync: the Transport is started from the MIDI
 * handler at the time the DAW event was heard, and phase-locked to the clock.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const PPQ = 192

const tone = vi.hoisted(() => {
  // Test time "1000 ms" is performance.now() at `clock.base`; audio time 10 is heard then.
  const clock = { base: 0 }
  const context = {
    state: 'running',
    rawContext: {
      currentTime: 10.03,
      // A fresh output timestamp: same mapping, sampled now.
      getOutputTimestamp: () => {
        const now = performance.now()
        return { contextTime: 10 + (now - clock.base) / 1000, performanceTime: now }
      },
    },
  }
  const transport = {
    state: 'stopped' as 'started' | 'stopped' | 'paused',
    bpm: { value: 100 },
    PPQ: 192,
    ticks: 0,
    startAt: 0,
    startTicks: 0,
    /** Extra ticks to simulate GigSync running ahead (+) or behind (-). */
    errorTicks: 0,
    start: vi.fn(),
    getTicksAtTime(time: number) {
      return this.startTicks + ((time - this.startAt) * this.bpm.value * this.PPQ) / 60 + this.errorTicks
    },
  }
  transport.start.mockImplementation((time: number, offset: string) => {
    transport.state = 'started'
    transport.startAt = time
    transport.startTicks = parseInt(offset, 10)
  })
  return { clock, context, transport }
})

vi.mock('tone', () => ({
  getContext: () => tone.context,
  getTransport: () => tone.transport,
  now: () => tone.context.rawContext.currentTime + 0.1,
  start: vi.fn(() => {
    tone.context.state = 'running'
    return Promise.resolve()
  }),
}))

import { useMIDITransportSync } from '../useMIDITransportSync'

class FakeMIDIInput extends EventTarget {
  state = 'connected'
  open = vi.fn(() => Promise.resolve(this))
  constructor(public id: string, public name: string) {
    super()
  }
  /** `timeStamp` in test time (1000 = the moment audio time 10 is heard). */
  send(bytes: number[], timeStamp: number) {
    const event = new Event('midimessage') as Event & { data: Uint8Array }
    Object.defineProperty(event, 'data', { value: new Uint8Array(bytes) })
    Object.defineProperty(event, 'timeStamp', { value: tone.clock.base + timeStamp - 1000 })
    this.dispatchEvent(event)
  }
}

const TICK_120 = 60000 / (120 * 24)

describe('useMIDITransportSync', () => {
  let daw: FakeMIDIInput
  const originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'requestMIDIAccess')

  beforeEach(() => {
    daw = new FakeMIDIInput('in-1', 'loopMIDI Port')
    const access = Object.assign(new EventTarget(), { inputs: new Map([[daw.id, daw]]) })
    Object.defineProperty(navigator, 'requestMIDIAccess', {
      configurable: true,
      writable: true,
      value: vi.fn(() => Promise.resolve(access)),
    })
    tone.clock.base = performance.now()
    Object.assign(tone.transport, { state: 'stopped', ticks: 0, errorTicks: 0, startAt: 0, startTicks: 0 })
    tone.transport.bpm.value = 100
    tone.transport.start.mockClear()
  })

  afterEach(() => {
    if (originalDescriptor) Object.defineProperty(navigator, 'requestMIDIAccess', originalDescriptor)
    else delete (navigator as unknown as Record<string, unknown>).requestMIDIAccess
  })

  async function renderListening(options: Parameters<typeof useMIDITransportSync>[0]) {
    const hook = renderHook(() => useMIDITransportSync(options))
    await waitFor(() => expect(hook.result.current.status).toBe('listening'))
    // Clock before Start (one quarter + 1) so the DAW tempo is known: 120 BPM.
    // Same grid as the ticks after Start at 1000 ms, ending one tick before it.
    act(() => {
      for (let i = 25; i >= 1; i--) daw.send([0xf8], 1000 - i * TICK_120)
    })
    return hook
  }

  it('follows the DAW tempo before Start', async () => {
    await renderListening({ enabled: true })
    expect(tone.transport.bpm.value).toBeCloseTo(120, 1)
  })

  it('on Start runs the caller first, then starts the Transport where the DAW is now', async () => {
    const calls: string[] = []
    tone.transport.start.mockImplementationOnce((time: number, offset: string) => {
      calls.push('transport.start')
      Object.assign(tone.transport, { state: 'started', startAt: time, startTicks: parseInt(offset, 10) })
    })
    await renderListening({ enabled: true, onStart: () => calls.push('onStart') })

    act(() => daw.send([0xfa], 1000))

    expect(calls).toEqual(['onStart', 'transport.start'])
    // Heard at audio time 10; Tone.now() is 10.13 → start then, 0.13 s (≈50 ticks at 120) in.
    const [startAt, offset] = tone.transport.start.mock.calls[0]
    expect(startAt).toBeCloseTo(10.13)
    expect(offset).toBe(`${Math.round(0.13 * 2 * PPQ)}i`)
  })

  it('applies the latency offset (positive = earlier)', async () => {
    await renderListening({ enabled: true, offsetMs: 20 })
    act(() => daw.send([0xfa], 1000))
    const [startAt, offset] = tone.transport.start.mock.calls[0]
    expect(startAt).toBeCloseTo(10.13)
    expect(offset).toBe(`${Math.round(0.15 * 2 * PPQ)}i`)
  })

  it('on Continue resumes from the paused position plus the elapsed time', async () => {
    await renderListening({ enabled: true })
    Object.assign(tone.transport, { state: 'paused', ticks: 384 })
    act(() => daw.send([0xfb], 1000))
    const [, offset] = tone.transport.start.mock.calls[0]
    expect(offset).toBe(`${384 + Math.round(0.13 * 2 * PPQ)}i`)
  })

  it('nudges the tempo once per quarter to close a phase gap', async () => {
    await renderListening({ enabled: true })
    act(() => daw.send([0xfa], 1000))

    // GigSync runs 0.04 of a quarter ahead.
    tone.transport.errorTicks = 0.04 * PPQ
    act(() => {
      for (let i = 0; i < 24; i++) daw.send([0xf8], 1000 + i * TICK_120)
    })
    expect(tone.transport.bpm.value).toBeCloseTo(120, 1) // not a correction point yet

    act(() => daw.send([0xf8], 1000 + 24 * TICK_120))
    expect(tone.transport.bpm.value).toBeCloseTo(120 * (1 - 0.8 * 0.04), 0)
    expect(tone.transport.bpm.value).toBeLessThan(120)
  })

  it('on Stop unlocks, restores the DAW tempo and calls the caller', async () => {
    const onStop = vi.fn()
    await renderListening({ enabled: true, onStop })
    act(() => daw.send([0xfa], 1000))
    tone.transport.errorTicks = 0.04 * PPQ
    act(() => {
      for (let i = 0; i <= 24; i++) daw.send([0xf8], 1000 + i * TICK_120)
    })
    expect(tone.transport.bpm.value).toBeLessThan(119)

    act(() => daw.send([0xfc], 2000))
    expect(onStop).toHaveBeenCalled()
    expect(tone.transport.bpm.value).toBeCloseTo(120, 1)
  })

  it('resumes a suspended audio context and then starts aligned to the DAW event', async () => {
    tone.context.state = 'suspended'
    const onStart = vi.fn()
    await renderListening({ enabled: true, onStart })
    act(() => daw.send([0xfa], 1000))
    expect(onStart).toHaveBeenCalled()
    expect(tone.transport.start).not.toHaveBeenCalled()

    await waitFor(() => expect(tone.transport.start).toHaveBeenCalledTimes(1))
    expect(tone.context.state).toBe('running')
    expect(tone.transport.start.mock.calls[0][1]).toBe(`${Math.round(0.13 * 2 * PPQ)}i`)
  })

  it('leaves it alone if the player started the Transport while the context resumed', async () => {
    tone.context.state = 'suspended'
    await renderListening({ enabled: true, onStart: () => { tone.transport.state = 'started' } })
    act(() => daw.send([0xfa], 1000))
    await waitFor(() => expect(tone.context.state).toBe('running'))
    expect(tone.transport.start).not.toHaveBeenCalled()
  })
})
