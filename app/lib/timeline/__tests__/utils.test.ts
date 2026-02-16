/**
 * Tests for timeline utilities
 */

import { describe, it, expect } from 'vitest'
import {
  parseTimeSignature,
  beatsToSeconds,
  barsToBeats,
  secondsToBeats
} from '../utils'

describe('parseTimeSignature', () => {
  it('should parse standard 4/4 time signature', () => {
    const result = parseTimeSignature('4/4')
    expect(result).toEqual({ beats: 4, noteValue: 4 })
  })

  it('should parse 3/4 waltz time', () => {
    const result = parseTimeSignature('3/4')
    expect(result).toEqual({ beats: 3, noteValue: 4 })
  })

  it('should parse 6/8 compound time', () => {
    const result = parseTimeSignature('6/8')
    expect(result).toEqual({ beats: 6, noteValue: 8 })
  })

  it('should default to 4/4 for invalid input', () => {
    const result = parseTimeSignature('invalid')
    // parseTimeSignature uses || 4 fallback, so NaN becomes 4
    expect(result).toEqual({ beats: 4, noteValue: 4 })
  })
})

describe('beatsToSeconds', () => {
  it('should convert beats to seconds at 120 BPM', () => {
    // At 120 BPM, 1 beat = 0.5 seconds
    expect(beatsToSeconds(4, 120)).toBe(2)
    expect(beatsToSeconds(8, 120)).toBe(4)
  })

  it('should convert beats to seconds at 60 BPM', () => {
    // At 60 BPM, 1 beat = 1 second
    expect(beatsToSeconds(4, 60)).toBe(4)
    expect(beatsToSeconds(1, 60)).toBe(1)
  })

  it('should convert beats to seconds at 90 BPM', () => {
    // At 90 BPM, 1 beat = 0.666... seconds
    expect(beatsToSeconds(3, 90)).toBeCloseTo(2, 1)
  })
})

describe('barsToBeats', () => {
  it('should convert bars to beats in 4/4', () => {
    expect(barsToBeats(2, 4)).toBe(8)
    expect(barsToBeats(4, 4)).toBe(16)
  })

  it('should convert bars to beats in 3/4', () => {
    expect(barsToBeats(2, 3)).toBe(6)
    expect(barsToBeats(4, 3)).toBe(12)
  })

  it('should handle fractional bars', () => {
    expect(barsToBeats(1.5, 4)).toBe(6)
    expect(barsToBeats(2.5, 3)).toBe(7.5)
  })
})

describe('secondsToBeats', () => {
  it('should convert seconds to beats at 120 BPM', () => {
    expect(secondsToBeats(2, 120)).toBe(4)
    expect(secondsToBeats(4, 120)).toBe(8)
  })

  it('should convert seconds to beats at 60 BPM', () => {
    expect(secondsToBeats(4, 60)).toBe(4)
    expect(secondsToBeats(1, 60)).toBe(1)
  })
})
