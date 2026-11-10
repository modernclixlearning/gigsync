import { describe, it, expect } from 'vitest'
import { DRUM_PATTERNS, DRUM_PATTERN_DEFS, drumVelocity } from '../bandSound'

describe('drum patterns', () => {
  it('every pattern is one 4/4 bar of 16 steps per part, or two bars (bossa)', () => {
    for (const name of DRUM_PATTERNS) {
      for (const lane of Object.values(DRUM_PATTERN_DEFS[name])) expect(lane).toHaveLength(name === 'bossa' ? 32 : 16)
    }
  })

  it('bossa: the 3-2 clave on the cross-stick over two bars, the bass drum on 1, 2&, 3, 4&', () => {
    const hits = (part: 'kick' | 'snare' | 'hat') =>
      Array.from({ length: 32 }, (_, step) => step).filter((step) => drumVelocity('bossa', part, step, 4) > 0)
    // Bar 1: 1, 2&, 4 — bar 2: 2, 3&
    expect(hits('snare')).toEqual([0, 6, 12, 16 + 4, 16 + 10])
    expect(hits('kick')).toEqual([0, 6, 8, 14, 16, 22, 24, 30])
    expect(hits('hat')).toEqual(Array.from({ length: 16 }, (_, i) => i * 2))
    // The two bars repeat as a pair
    expect(drumVelocity('bossa', 'snare', 32, 4)).toBeGreaterThan(0)
    expect(drumVelocity('bossa', 'snare', 32 + 16, 4)).toBe(0)
  })

  it('rock: kick on 1, snare on 2 and 4, hats on eighths', () => {
    expect(drumVelocity('rock', 'kick', 0, 4)).toBe(1)
    expect(drumVelocity('rock', 'snare', 4, 4)).toBe(1)
    expect(drumVelocity('rock', 'snare', 12, 4)).toBe(1)
    expect(drumVelocity('rock', 'snare', 0, 4)).toBe(0)
    expect(drumVelocity('rock', 'hat', 2, 4)).toBeGreaterThan(0)
    expect(drumVelocity('rock', 'hat', 1, 4)).toBe(0)
  })

  it('pop has the kick on every beat', () => {
    expect([0, 4, 8, 12].map((step) => drumVelocity('pop', 'kick', step, 4))).toEqual([1, 1, 1, 1])
  })

  it('repeats every bar, and fits other time signatures', () => {
    expect(drumVelocity('rock', 'kick', 16, 4)).toBe(1)
    // 3/4: the bar is 12 steps, so step 12 is the next downbeat.
    expect(drumVelocity('rock', 'kick', 12, 3)).toBe(1)
    expect(drumVelocity('rock', 'kick', 24, 3)).toBe(1)
    // 6 beats (6/8 as Tone counts): 24 steps, the 16-step pattern wraps.
    expect(drumVelocity('rock', 'snare', 4, 6)).toBe(1)
  })
})
