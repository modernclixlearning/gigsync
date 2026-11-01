/**
 * Tests for useChordPlayback: one Transport Part event per chord, placed in
 * ticks, voiced as bass + chord; Play in the middle of a chord sounds it for
 * what's left; pause silences.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

type PartEvent = { time: string; pitches: number[]; ticks: number }

const tone = vi.hoisted(() => {
  const synths: {
    triggerAttackRelease: ReturnType<typeof vi.fn>
    releaseAll: ReturnType<typeof vi.fn>
    dispose: ReturnType<typeof vi.fn>
    volume: { value: number }
    maxPolyphony: number
  }[] = []
  const parts: {
    callback: (time: number, event: unknown) => void
    events: unknown[]
    start: ReturnType<typeof vi.fn>
    dispose: ReturnType<typeof vi.fn>
  }[] = []
  const transport = {
    PPQ: 192,
    ticks: 0,
    scheduleOnce: vi.fn((_callback: (time: number) => void, _at: string) => 7),
    clear: vi.fn(),
  }
  return { synths, parts, transport }
})

vi.mock('tone', () => ({
  Synth: vi.fn(),
  PolySynth: vi.fn().mockImplementation(() => {
    const synth = {
      volume: { value: 0 },
      maxPolyphony: 32,
      toDestination() {
        return synth
      },
      triggerAttackRelease: vi.fn(),
      releaseAll: vi.fn(),
      dispose: vi.fn(),
    }
    tone.synths.push(synth)
    return synth
  }),
  Part: vi.fn().mockImplementation((callback: (time: number, event: unknown) => void, events: unknown[]) => {
    const part = { callback, events, start: vi.fn(), dispose: vi.fn() }
    tone.parts.push(part)
    return part
  }),
  getTransport: vi.fn(() => tone.transport),
  Ticks: vi.fn((ticks: number) => ({ toSeconds: () => (ticks / 192) * 0.5 })),
  Frequency: vi.fn((pitch: number) => ({ toFrequency: () => pitch })),
  gainToDb: vi.fn((gain: number) => 20 * Math.log10(gain)),
}))

import { useChordPlayback } from '../useChordPlayback'

const events = [
  { chord: 'C', startBeat: 0, durationBeats: 4 },
  { chord: 'G/B', startBeat: 4, durationBeats: 4 },
  { chord: 'N.C.?', startBeat: 8, durationBeats: 4 }, // not a chord: skipped
]

describe('useChordPlayback', () => {
  beforeEach(() => {
    tone.synths.length = 0
    tone.parts.length = 0
    tone.transport.ticks = 0
    tone.transport.scheduleOnce.mockClear()
    tone.transport.clear.mockClear()
  })

  it('does nothing while chord sound is off', () => {
    renderHook(() => useChordPlayback({ enabled: false, isPlaying: true, events }))
    expect(tone.synths).toHaveLength(0)
    expect(tone.parts).toHaveLength(0)
  })

  it('plays at the volume it is given, and follows changes to it', () => {
    const { rerender } = renderHook(({ volume }) => useChordPlayback({ enabled: true, isPlaying: false, events, volume }), {
      initialProps: { volume: 0.5 },
    })
    expect(tone.synths[0].volume.value).toBeCloseTo(-6.02, 1)
    rerender({ volume: 0.1 })
    expect(tone.synths[0].volume.value).toBeCloseTo(-20, 1)
  })

  it('puts every chord on the Transport at its tick, voiced as bass + chord', () => {
    renderHook(() => useChordPlayback({ enabled: true, isPlaying: false, events }))
    const part = tone.parts[0]
    expect(part.start).toHaveBeenCalledWith(0)
    expect(part.events as PartEvent[]).toEqual([
      { time: '0i', pitches: [48, 60, 64, 67], ticks: 768 },
      { time: '768i', pitches: [47, 55, 59, 62], ticks: 768 },
    ])
  })

  it('sounds a chord at its scheduled time only while playing', () => {
    const { rerender } = renderHook(({ isPlaying }) => useChordPlayback({ enabled: true, isPlaying, events }), {
      initialProps: { isPlaying: false },
    })
    const [synth] = tone.synths
    const [part] = tone.parts
    const [first] = part.events as PartEvent[]
    part.callback(12.5, first)
    expect(synth.triggerAttackRelease).not.toHaveBeenCalled()

    rerender({ isPlaying: true })
    part.callback(12.5, first)
    expect(synth.triggerAttackRelease).toHaveBeenCalledWith([48, 60, 64, 67], expect.closeTo(1.84, 2), 12.5, 0.7)
  })

  it('on Play mid-chord, sounds that chord for what is left of it; Pause silences', () => {
    tone.transport.ticks = 192 * 5 // beat 5: one beat into G/B
    const { rerender } = renderHook(({ isPlaying }) => useChordPlayback({ enabled: true, isPlaying, events }), {
      initialProps: { isPlaying: false },
    })
    rerender({ isPlaying: true })
    expect(tone.transport.scheduleOnce).toHaveBeenCalledWith(expect.any(Function), '961i')
    const callback = tone.transport.scheduleOnce.mock.calls[0][0]
    callback(20)
    // 3 beats left of G/B.
    expect(tone.synths[0].triggerAttackRelease).toHaveBeenCalledWith([47, 55, 59, 62], expect.closeTo(1.38, 2), 20, 0.7)

    rerender({ isPlaying: false })
    expect(tone.transport.clear).toHaveBeenCalledWith(7)
    expect(tone.synths[0].releaseAll).toHaveBeenCalled()
  })

  it('does not double the chord when Play lands exactly on its start', () => {
    tone.transport.ticks = 192 * 4
    const { rerender } = renderHook(({ isPlaying }) => useChordPlayback({ enabled: true, isPlaying, events }), {
      initialProps: { isPlaying: false },
    })
    rerender({ isPlaying: true })
    expect(tone.transport.scheduleOnce).not.toHaveBeenCalled()
  })
})
