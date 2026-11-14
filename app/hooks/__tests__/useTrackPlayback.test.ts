/**
 * Tests for useTrackPlayback: one Transport Part event per written note, in
 * ticks; no instrument for an empty or silenced track; pause silences.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const tone = vi.hoisted(() => {
  const synths: { triggerAttackRelease: ReturnType<typeof vi.fn>; releaseAll: ReturnType<typeof vi.fn>; volume: { value: number }; voice: string }[] = []
  const parts: { callback: (time: number, event: unknown) => void; events: unknown[]; start: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }[] = []
  return { synths, parts, disposed: [] as string[] }
})

vi.mock('tone', () => ({
  Part: vi.fn().mockImplementation((callback: (time: number, event: unknown) => void, events: unknown[]) => {
    const part = { callback, events, start: vi.fn(), dispose: vi.fn() }
    tone.parts.push(part)
    return part
  }),
  getTransport: vi.fn(() => ({ PPQ: 192 })),
  Ticks: vi.fn((ticks: number) => ({ toSeconds: () => (ticks / 192) * 0.5 })),
  Frequency: vi.fn((pitch: number) => ({ toFrequency: () => pitch })),
  gainToDb: vi.fn((gain: number) => 20 * Math.log10(gain)),
}))

vi.mock('~/lib/audio/instruments', () => ({
  createTrackInstrument: vi.fn((voice: string) => {
    const synth = { volume: { value: 0 }, triggerAttackRelease: vi.fn(), releaseAll: vi.fn(), voice }
    tone.synths.push(synth)
    return { synth, dispose: () => tone.disposed.push(voice) }
  }),
}))

import { useTrackPlayback } from '../useTrackPlayback'

const notes = [
  { beat: 0, beats: 1, pitch: 60, velocity: 0.8 },
  { beat: 2.5, beats: 0.5, pitch: 67, velocity: 0.5 },
]

describe('useTrackPlayback', () => {
  beforeEach(() => {
    tone.synths.length = 0
    tone.parts.length = 0
    tone.disposed.length = 0
  })

  it('builds nothing for an empty or disabled track', () => {
    renderHook(() => useTrackPlayback({ enabled: true, isPlaying: true, voice: 'sax', notes: [] }))
    renderHook(() => useTrackPlayback({ enabled: false, isPlaying: true, voice: 'sax', notes }))
    expect(tone.synths).toHaveLength(0)
    expect(tone.parts).toHaveLength(0)
  })

  it('places every note at its tick and plays it with the voice of the track', () => {
    renderHook(() => useTrackPlayback({ enabled: true, isPlaying: true, voice: 'sax', notes, volume: 0.5 }))
    expect(tone.synths.map((s) => s.voice)).toEqual(['sax'])
    expect(tone.synths[0].volume.value).toBeCloseTo(-6.02, 1)
    expect(tone.parts[0].events).toEqual([
      { time: '0i', pitch: 60, ticks: 192, velocity: 0.8 },
      { time: '480i', pitch: 67, ticks: 96, velocity: 0.5 },
    ])
    expect(tone.parts[0].start).toHaveBeenCalledWith(0)

    tone.parts[0].callback(1.5, tone.parts[0].events[1])
    expect(tone.synths[0].triggerAttackRelease).toHaveBeenCalledWith([67], 0.25, 1.5, 0.5)
  })

  it('stays silent while paused and releases what was sounding', () => {
    const { rerender } = renderHook((props: { isPlaying: boolean }) => useTrackPlayback({ enabled: true, voice: 'strings', notes, ...props }), {
      initialProps: { isPlaying: true },
    })
    rerender({ isPlaying: false })
    expect(tone.synths[0].releaseAll).toHaveBeenCalled()
    tone.parts[0].callback(0, tone.parts[0].events[0])
    expect(tone.synths[0].triggerAttackRelease).not.toHaveBeenCalled()
  })

  it('rebuilds the instrument when the voice changes', () => {
    const { rerender } = renderHook((props: { voice: 'strings' | 'brass' }) => useTrackPlayback({ enabled: true, isPlaying: false, notes, ...props }), {
      initialProps: { voice: 'strings' as 'strings' | 'brass' },
    })
    rerender({ voice: 'brass' })
    expect(tone.disposed).toEqual(['strings'])
    expect(tone.synths.map((s) => s.voice)).toEqual(['strings', 'brass'])
  })
})
