/**
 * Tests for useDrumPlayback: a 16th-note Transport loop that hits the kit with
 * the pattern's step at the scheduled time, only while playing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const tone = vi.hoisted(() => ({
  loops: [] as { callback: (time: number) => void; interval: string; start: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }[],
  transport: { PPQ: 192, getTicksAtTime: vi.fn((_time: number) => 0) },
}))
const kit = vi.hoisted(() => ({ hit: vi.fn(), setVolume: vi.fn(), dispose: vi.fn() }))

vi.mock('tone', () => ({
  getTransport: vi.fn(() => tone.transport),
  Loop: vi.fn().mockImplementation((callback: (time: number) => void, interval: string) => {
    const loop = { callback, interval, start: vi.fn(), dispose: vi.fn() }
    tone.loops.push(loop)
    return loop
  }),
}))
vi.mock('~/lib/audio/instruments', () => ({ createDrumKit: vi.fn(() => kit) }))

import { useDrumPlayback, stepAtTick } from '../useDrumPlayback'

describe('stepAtTick', () => {
  it('counts 16th notes', () => {
    expect(stepAtTick(0, 192)).toBe(0)
    expect(stepAtTick(48, 192)).toBe(1)
    expect(stepAtTick(192, 192)).toBe(4)
  })
})

describe('useDrumPlayback', () => {
  beforeEach(() => {
    tone.loops.length = 0
    kit.hit.mockClear()
    kit.dispose.mockClear()
    kit.setVolume.mockClear()
    tone.transport.getTicksAtTime.mockReturnValue(0)
  })

  it('does nothing while the drums are off', () => {
    renderHook(() => useDrumPlayback({ enabled: false, isPlaying: true, pattern: 'rock', beatsPerBar: 4 }))
    expect(tone.loops).toHaveLength(0)
  })

  it('hits the downbeat kick and hat at the scheduled time while playing', () => {
    renderHook(() => useDrumPlayback({ enabled: true, isPlaying: true, pattern: 'rock', beatsPerBar: 4, volume: 0.4 }))
    expect(tone.loops[0].interval).toBe('16n')
    expect(tone.loops[0].start).toHaveBeenCalledWith(0)
    expect(kit.setVolume).toHaveBeenCalledWith(0.4)
    tone.loops[0].callback(3.5)
    expect(tone.transport.getTicksAtTime).toHaveBeenCalledWith(3.5)
    expect(kit.hit).toHaveBeenCalledWith('kick', 3.5, 1)
    expect(kit.hit).toHaveBeenCalledWith('hat', 3.5, 1)
    expect(kit.hit).not.toHaveBeenCalledWith('snare', expect.anything(), expect.anything())
  })

  it('follows the Transport position (snare on beat 2), and is silent when paused', () => {
    const { rerender } = renderHook(({ isPlaying }) => useDrumPlayback({ enabled: true, isPlaying, pattern: 'rock', beatsPerBar: 4 }), {
      initialProps: { isPlaying: false },
    })
    tone.loops[0].callback(1)
    expect(kit.hit).not.toHaveBeenCalled()
    rerender({ isPlaying: true })
    tone.transport.getTicksAtTime.mockReturnValue(192) // beat 2
    tone.loops[0].callback(2)
    expect(kit.hit).toHaveBeenCalledWith('snare', 2, 1)
  })

  it('tears the loop and the kit down', () => {
    const { unmount } = renderHook(() => useDrumPlayback({ enabled: true, isPlaying: true, pattern: 'rock', beatsPerBar: 4 }))
    unmount()
    expect(tone.loops[0].dispose).toHaveBeenCalled()
    expect(kit.dispose).toHaveBeenCalled()
  })
})
