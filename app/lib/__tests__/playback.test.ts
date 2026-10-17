import { describe, it, expect } from 'vitest'
import { countInBeats, isSongFinished, resolvePlaybackPreferences } from '../playback'

describe('resolvePlaybackPreferences', () => {
  it('defaults settings saved before these options existed', () => {
    expect(resolvePlaybackPreferences(undefined)).toEqual({
      autoAdvance: false,
      autoAdvanceDelaySeconds: 15,
      countInBars: 1,
    })
    expect(resolvePlaybackPreferences({ gridResolution: 0.25 })).toEqual({
      autoAdvance: false,
      autoAdvanceDelaySeconds: 15,
      countInBars: 1,
    })
  })

  it('keeps saved values and clamps them to the allowed range', () => {
    expect(resolvePlaybackPreferences({ autoAdvance: true, autoAdvanceDelaySeconds: 0, countInBars: 2 })).toEqual({
      autoAdvance: true,
      autoAdvanceDelaySeconds: 0,
      countInBars: 2,
    })
    const clamped = resolvePlaybackPreferences({ autoAdvanceDelaySeconds: 999, countInBars: 9 })
    expect(clamped.autoAdvanceDelaySeconds).toBe(120)
    expect(clamped.countInBars).toBe(4)
  })
})

describe('countInBeats', () => {
  it('counts whole bars of the time signature', () => {
    expect(countInBeats(4, 1)).toBe(4)
    expect(countInBeats(3, 2)).toBe(6)
    expect(countInBeats(6, 1)).toBe(6)
  })
})

describe('isSongFinished', () => {
  it('is true once the transport reaches the last beat', () => {
    expect(isSongFinished(63, 64)).toBe(false)
    expect(isSongFinished(64, 64)).toBe(true)
    expect(isSongFinished(70, 64)).toBe(true)
  })

  it('is false while the timeline is not computed', () => {
    expect(isSongFinished(10, 0)).toBe(false)
  })
})
