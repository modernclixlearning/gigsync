/**
 * Tests for useMetronomeSound: clicks are scheduled at the Transport loop's
 * audio time (not "now" from a React effect), with the accent on downbeats.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const tone = vi.hoisted(() => {
  const synths: { triggerAttackRelease: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }[] = []
  const loops: { callback: (time: number) => void; interval: string; start: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }[] = []
  const transport = {
    PPQ: 192,
    timeSignature: 4,
    getTicksAtTime: vi.fn((time: number) => time * 192),
  }
  return { synths, loops, transport }
})

vi.mock('tone', () => ({
  Synth: vi.fn().mockImplementation(() => {
    const synth = {
      volume: { value: 0 },
      toDestination() {
        return synth
      },
      triggerAttackRelease: vi.fn(),
      dispose: vi.fn(),
    }
    tone.synths.push(synth)
    return synth
  }),
  Loop: vi.fn().mockImplementation((callback: (time: number) => void, interval: string) => {
    const loop = { callback, interval, start: vi.fn(), dispose: vi.fn() }
    tone.loops.push(loop)
    return loop
  }),
  getTransport: vi.fn(() => tone.transport),
  gainToDb: vi.fn((gain: number) => 20 * Math.log10(gain)),
  now: vi.fn(() => 999),
}))

import { isDownbeat, useMetronomeSound } from '../useMetronomeSound'

describe('isDownbeat', () => {
  it('accents the first quarter of each 4/4 bar', () => {
    expect([0, 1, 2, 3, 4, 5].map((q) => isDownbeat(q * 192, 192, 4))).toEqual([
      true, false, false, false, true, false,
    ])
  })

  it('uses Tone measure length in quarters (6/8 = 3)', () => {
    expect([0, 1, 2, 3].map((q) => isDownbeat(q * 192, 192, 3))).toEqual([true, false, false, true])
  })

  it('tolerates tick rounding around the bar line', () => {
    expect(isDownbeat(4 * 192 - 1, 192, 4)).toBe(true)
    expect(isDownbeat(4 * 192 + 1, 192, 4)).toBe(true)
  })
})

describe('useMetronomeSound', () => {
  beforeEach(() => {
    tone.synths.length = 0
    tone.loops.length = 0
  })

  it('does nothing while disabled', () => {
    renderHook(() => useMetronomeSound({ enabled: false, isPlaying: true }))
    expect(tone.loops).toHaveLength(0)
  })

  it('schedules each click at the loop audio time, accenting downbeats', () => {
    renderHook(() => useMetronomeSound({ enabled: true, isPlaying: true }))
    expect(tone.loops).toHaveLength(1)
    const [loop] = tone.loops
    expect(loop.interval).toBe('4n')
    expect(loop.start).toHaveBeenCalledWith(0)

    // Ticks = time * PPQ in the mock, so time N is quarter N.
    loop.callback(4)
    loop.callback(5)

    const synth = tone.synths[0]
    expect(synth.triggerAttackRelease).toHaveBeenNthCalledWith(1, 1200, '32n', 4)
    expect(synth.triggerAttackRelease).toHaveBeenNthCalledWith(2, 800, '32n', 5)
  })

  it('stays silent while not playing or with the silent sound', () => {
    const { rerender } = renderHook((props: { isPlaying: boolean; sound?: 'classic' | 'silent' }) =>
      useMetronomeSound({ enabled: true, ...props }), {
      initialProps: { isPlaying: false } as { isPlaying: boolean; sound?: 'classic' | 'silent' },
    })
    tone.loops[0].callback(0)

    rerender({ isPlaying: true, sound: 'silent' })
    tone.loops[0].callback(1)

    expect(tone.synths[0].triggerAttackRelease).not.toHaveBeenCalled()
  })

  it('disposes the loop and synth when disabled', () => {
    const { rerender } = renderHook((props: { enabled: boolean }) =>
      useMetronomeSound({ enabled: props.enabled, isPlaying: true }), { initialProps: { enabled: true } })
    rerender({ enabled: false })
    expect(tone.loops[0].dispose).toHaveBeenCalled()
    expect(tone.synths[0].dispose).toHaveBeenCalled()
  })
})
