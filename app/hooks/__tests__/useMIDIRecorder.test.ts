/**
 * Tests for useMIDIRecorder: clicks on the audio clock, count-in, notes placed
 * by the time they were heard relative to the first downbeat, and the chords.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const tone = vi.hoisted(() => {
  const context = {
    state: 'running',
    currentTime: 10,
    rawContext: {
      get currentTime() {
        return context.currentTime
      },
      // Fresh output timestamp: audio time `currentTime` is heard right now.
      getOutputTimestamp: () => ({ contextTime: context.currentTime, performanceTime: performance.now() }),
    },
  }
  const clicks: { freq: number; time: number }[] = []
  const attacks: number[] = []
  return { context, clicks, attacks }
})

vi.mock('tone', () => {
  class Synth {
    toDestination() {
      return this
    }
    triggerAttackRelease(freq: number, _duration: string, time: number) {
      tone.clicks.push({ freq, time })
    }
    dispose() {}
  }
  class PolySynth {
    volume = { value: 0 }
    toDestination() {
      return this
    }
    triggerAttack(freq: number) {
      tone.attacks.push(freq)
    }
    triggerRelease() {}
    releaseAll() {}
    dispose() {}
  }
  return {
    Synth,
    PolySynth,
    getContext: () => tone.context,
    now: () => tone.context.currentTime + 0.1,
    immediate: () => tone.context.currentTime,
    start: vi.fn(() => Promise.resolve()),
    Frequency: (midi: number) => ({ toFrequency: () => 440 * 2 ** ((midi - 69) / 12) }),
  }
})

import { useMIDIRecorder } from '../useMIDIRecorder'

class FakeMIDIInput extends EventTarget {
  state = 'connected'
  open = vi.fn(() => Promise.resolve(this))
  constructor(public id: string, public name: string) {
    super()
  }
  /** Sends a message heard at `audioTime` (on the fake audio clock). */
  sendAt(bytes: number[], audioTime: number) {
    const event = new Event('midimessage') as Event & { data: Uint8Array }
    Object.defineProperty(event, 'data', { value: new Uint8Array(bytes) })
    const timeStamp = performance.now() + (audioTime - tone.context.currentTime) * 1000
    Object.defineProperty(event, 'timeStamp', { value: timeStamp })
    this.dispatchEvent(event)
  }
  chord(pitches: number[], on: number, off: number) {
    for (const p of pitches) this.sendAt([0x90, p, 100], on)
    for (const p of pitches) this.sendAt([0x80, p, 0], off)
  }
}

// 120 BPM, 4/4, one bar of count-in: first click at Tone.now() + 0.05 = 10.15,
// first downbeat of the recording at 10.15 + 4 × 0.5 = 12.15.
const ORIGIN = 12.15

describe('useMIDIRecorder', () => {
  let keys: FakeMIDIInput
  let access: MIDIAccess

  beforeEach(() => {
    tone.context.currentTime = 10
    tone.clicks.length = 0
    tone.attacks.length = 0
    keys = new FakeMIDIInput('in-1', 'Minilab3 MIDI')
    access = { inputs: new Map([[keys.id, keys]]) } as unknown as MIDIAccess
  })

  function renderRecorder(monitor = false) {
    return renderHook(() =>
      useMIDIRecorder({ access, inputId: keys.id, bpm: 120, beatsPerBar: 4, countInBars: 1, monitor }),
    )
  }

  it('shows what is being held before recording, and plays it when monitoring', () => {
    const { result } = renderRecorder(true)
    act(() => {
      for (const p of [57, 60, 64]) keys.sendAt([0x90, p, 100], 10)
    })
    expect(result.current.sounding).toBe('Am')
    expect(tone.attacks).toHaveLength(3)
    act(() => keys.sendAt([0x99, 36, 100], 10)) // drum pad: ignored
    expect(tone.attacks).toHaveLength(3)
  })

  it('counts in with an accented click per bar, scheduled on the audio clock', async () => {
    const { result } = renderRecorder()
    await act(() => result.current.start())
    expect(result.current.phase).toBe('count-in')
    expect(tone.clicks[0]).toEqual({ freq: 1200, time: expect.closeTo(10.15, 6) })

    // Let the scheduler run over the count-in and into bar 1.
    tone.context.currentTime = ORIGIN + 0.6
    await waitFor(() => expect(tone.clicks.length).toBeGreaterThanOrEqual(6))
    expect(tone.clicks.slice(0, 6).map((c) => c.freq)).toEqual([1200, 800, 800, 800, 1200, 800])
    expect(tone.clicks[4].time).toBeCloseTo(ORIGIN)
    act(() => result.current.stop())
  })

  it('places the chords on the bars of the click and returns them on Stop', async () => {
    const { result } = renderRecorder()
    await act(() => result.current.start())

    act(() => {
      keys.chord([48, 60, 64, 67], ORIGIN - 0.03, ORIGIN + 1.9) // C, a hair early
      keys.chord([45, 57, 60, 64], ORIGIN + 2, ORIGIN + 3.9) // Am
      keys.chord([41, 57, 60, 65], ORIGIN + 4, ORIGIN + 4.9) // F (half bar)
      keys.chord([43, 55, 59, 62], ORIGIN + 5, ORIGIN + 5.9) // G (half bar)
    })
    tone.context.currentTime = ORIGIN + 5.95 // stopped just before the bar line
    act(() => result.current.stop())

    expect(result.current.phase).toBe('done')
    const recording = result.current.recording!
    expect(recording.durationSeconds).toBeCloseTo(5.95, 2)
    expect(recording.notes[0].startTimeSeconds).toBe(0)
    expect(recording.progression.bars.map((b) => b.cells.map((c) => c.chord))).toEqual([['C'], ['Am'], ['F', 'G']])
  })

  it('carries a chord held from the count-in into bar 1', async () => {
    const { result } = renderRecorder()
    act(() => {
      for (const p of [43, 55, 59, 62]) keys.sendAt([0x90, p, 100], 10)
    })
    await act(() => result.current.start())
    act(() => {
      for (const p of [43, 55, 59, 62]) keys.sendAt([0x80, p, 0], ORIGIN + 1.9)
    })
    tone.context.currentTime = ORIGIN + 2
    act(() => result.current.stop())
    expect(result.current.recording!.progression.bars.map((b) => b.cells[0].chord)).toEqual(['G'])
  })

  it('reset goes back to idle', async () => {
    const { result } = renderRecorder()
    await act(() => result.current.start())
    act(() => result.current.reset())
    expect(result.current.phase).toBe('idle')
    expect(result.current.recording).toBeNull()
  })
})
