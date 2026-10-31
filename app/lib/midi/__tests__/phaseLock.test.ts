import { describe, it, expect } from 'vitest'
import { correctTempo, createPhaseLock } from '../phaseLock'
import { createAudioTimeMapper, performanceTimeToAudioTime } from '../audioTime'

describe('createPhaseLock', () => {
  it('is idle until started', () => {
    const lock = createPhaseLock()
    expect(lock.isLocked()).toBe(false)
    expect(lock.tick()).toBeNull()
  })

  it('returns the expected quarter once per quarter note, skipping the first tick', () => {
    const lock = createPhaseLock()
    lock.start(0)
    const results = Array.from({ length: 49 }, () => lock.tick())
    expect(results[0]).toBeNull()
    expect(results[24]).toBe(1)
    expect(results[48]).toBe(2)
    expect(results.filter((r) => r !== null)).toHaveLength(2)
  })

  it('counts from the position the DAW continued from, and stops', () => {
    const lock = createPhaseLock()
    lock.start(10.5)
    const values = Array.from({ length: 25 }, () => lock.tick())
    expect(values[24]).toBe(11.5)
    lock.stop()
    expect(lock.isLocked()).toBe(false)
    expect(lock.tick()).toBeNull()
  })
})

describe('correctTempo', () => {
  it('slows down when GigSync is ahead and speeds up when behind', () => {
    expect(correctTempo(120, 0.04)).toBeCloseTo(116.16)
    expect(correctTempo(120, -0.04)).toBeCloseTo(123.84)
    expect(correctTempo(120, 0)).toBe(120)
  })

  it('caps the deviation from the DAW tempo', () => {
    expect(correctTempo(100, 1)).toBeCloseTo(96)
    expect(correctTempo(100, -1)).toBeCloseTo(104)
  })
})

describe('performanceTimeToAudioTime', () => {
  it('uses a fresh output timestamp (what is heard) when available', () => {
    const context = {
      currentTime: 10.05,
      getOutputTimestamp: () => ({ contextTime: 10, performanceTime: 5000 }),
    }
    expect(performanceTimeToAudioTime(5100, context, 5010)).toBeCloseTo(10.1)
    expect(performanceTimeToAudioTime(4980, context, 5010)).toBeCloseTo(9.98)
  })

  it('falls back to currentTime minus elapsed time and output latency', () => {
    const context = {
      currentTime: 10,
      getOutputTimestamp: () => ({ contextTime: 0, performanceTime: 0 }),
      outputLatency: 0.03,
    }
    expect(performanceTimeToAudioTime(4950, context, 5000)).toBeCloseTo(10 - 0.05 - 0.03)
  })
})

describe('createAudioTimeMapper', () => {
  it('learns the output delay while fresh and uses it once the output timestamp goes stale', () => {
    const map = createAudioTimeMapper()
    // Heard audio runs 64 ms behind currentTime; the browser reports 40 ms.
    const fresh = {
      currentTime: 20.064,
      outputLatency: 0.04,
      getOutputTimestamp: () => ({ contextTime: 20, performanceTime: 5000 }),
    }
    expect(map(5000, fresh, 5000)).toBeCloseTo(20)

    // Silence: Chrome stops refreshing the timestamp (3.6 s old here).
    const stale = {
      currentTime: 24.064,
      outputLatency: 0.04,
      getOutputTimestamp: () => ({ contextTime: 20, performanceTime: 5400 }),
    }
    // Now = 9000 ms ↔ currentTime 24.064, heard 64 ms behind → 9000 ms is heard at 24.
    expect(map(9000, stale, 9000)).toBeCloseTo(24)
    expect(map(8990, stale, 9000)).toBeCloseTo(23.99)
  })

  it('uses the reported latency when it never saw a fresh timestamp', () => {
    const map = createAudioTimeMapper()
    const stale = {
      currentTime: 24,
      outputLatency: 0.04,
      getOutputTimestamp: () => ({ contextTime: 20, performanceTime: 5400 }),
    }
    expect(map(9000, stale, 9000)).toBeCloseTo(23.96)
  })
})
