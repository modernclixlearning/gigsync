import { describe, it, expect } from 'vitest'
import { DRUM_PATTERNS, DRUM_PATTERN_DEFS, drumVelocity } from '../bandSound'

describe('drum patterns', () => {
  it('every pattern is one 4/4 bar of 16 steps per part', () => {
    for (const name of DRUM_PATTERNS) {
      for (const lane of Object.values(DRUM_PATTERN_DEFS[name])) expect(lane).toHaveLength(16)
    }
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
