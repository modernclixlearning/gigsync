import { describe, it, expect } from 'vitest'
import {
  parseMIDIRealtimeMessage,
  bpmFromTickInterval,
  regressionTickInterval,
  createClockBpmEstimator,
  getMIDIClockStatusMessage,
  MIDI_CLOCK_PPQN,
} from '../midi/clock'

/** Feeds `count` ticks at `bpm` starting at `startMs`, with optional per-tick jitter. Returns emitted values and the next timestamp. */
function feed(
  estimator: ReturnType<typeof createClockBpmEstimator>,
  bpm: number,
  count: number,
  startMs = 0,
  jitter: (i: number) => number = () => 0
) {
  const interval = 60000 / (bpm * MIDI_CLOCK_PPQN)
  const emitted: number[] = []
  let t = startMs
  for (let i = 0; i < count; i++) {
    const value = estimator.tick(t + jitter(i))
    if (value !== null) emitted.push(value)
    t += interval
  }
  return { emitted, nextMs: t }
}

describe('parseMIDIRealtimeMessage', () => {
  it('classifies clock and transport messages', () => {
    expect(parseMIDIRealtimeMessage([0xf8])).toBe('clock')
    expect(parseMIDIRealtimeMessage(new Uint8Array([0xfa]))).toBe('start')
    expect(parseMIDIRealtimeMessage([0xfb])).toBe('continue')
    expect(parseMIDIRealtimeMessage([0xfc])).toBe('stop')
  })

  it('ignores everything else', () => {
    expect(parseMIDIRealtimeMessage([0x90, 60, 100])).toBeNull() // note on
    expect(parseMIDIRealtimeMessage([0xfe])).toBeNull() // active sensing
    expect(parseMIDIRealtimeMessage([0xf2, 0, 0])).toBeNull() // song position pointer
    expect(parseMIDIRealtimeMessage([])).toBeNull()
    expect(parseMIDIRealtimeMessage(null)).toBeNull()
  })
})

describe('bpmFromTickInterval / regressionTickInterval', () => {
  it('24 ticks per quarter note: 20.833ms between ticks is 120 BPM', () => {
    expect(bpmFromTickInterval(60000 / (120 * 24))).toBeCloseTo(120, 6)
    expect(bpmFromTickInterval(0)).toBe(0)
  })

  it('regression recovers the mean interval of evenly spaced ticks', () => {
    expect(regressionTickInterval([0, 10, 20, 30])).toBeCloseTo(10, 9)
    expect(regressionTickInterval([5])).toBe(0)
  })
})

describe('createClockBpmEstimator', () => {
  it('emits nothing until one quarter note (24 intervals) has been received', () => {
    const estimator = createClockBpmEstimator()
    const { emitted } = feed(estimator, 120, 24)
    expect(emitted).toEqual([])
    expect(estimator.getBpm()).toBeNull()
    // 25th tick completes 24 intervals
    expect(estimator.tick(24 * (60000 / (120 * 24)))).toBeCloseTo(120, 2)
  })

  it('emits a steady tempo once and then stays quiet (no thrash)', () => {
    const estimator = createClockBpmEstimator()
    const { emitted } = feed(estimator, 128, 24 * 16 + 1)
    expect(emitted).toHaveLength(1)
    expect(emitted[0]).toBeCloseTo(128, 2)
  })

  it('tames jitter: ±1.5ms per tick stays within 0.15 BPM of the real tempo', () => {
    const estimator = createClockBpmEstimator()
    // deterministic pseudo-random jitter in [-1.5, 1.5] ms
    const jitter = (i: number) => (((i * 7919) % 31) / 30 - 0.5) * 3
    const { emitted } = feed(estimator, 120, 24 * 16 + 1, 0, jitter)
    expect(emitted.length).toBeGreaterThan(0)
    expect(Math.abs(estimator.getBpm()! - 120)).toBeLessThan(0.15)
    // Re-emits at most once per quarter note
    expect(emitted.length).toBeLessThanOrEqual(16)
  })

  it('follows a tempo change in the DAW within a couple of beats', () => {
    const estimator = createClockBpmEstimator()
    const first = feed(estimator, 120, 24 * 8 + 1)
    expect(estimator.getBpm()).toBeCloseTo(120, 2)
    // Continue seamlessly at 90 BPM
    const interval120 = 60000 / (120 * 24)
    feed(estimator, 90, 24 * 3, first.nextMs - interval120 + 60000 / (90 * 24))
    expect(estimator.getBpm()).toBeCloseTo(90, 1)
  })

  it('a long gap (clock stopped) resets the window but keeps the last BPM', () => {
    const estimator = createClockBpmEstimator()
    const first = feed(estimator, 100, 24 * 2 + 1)
    expect(estimator.getBpm()).toBeCloseTo(100, 2)
    // 2 seconds of silence, then a few ticks: not enough for a new estimate
    feed(estimator, 140, 10, first.nextMs + 2000)
    expect(estimator.getBpm()).toBeCloseTo(100, 2)
    // after one full quarter note at the new tempo it updates
    const estimator2 = createClockBpmEstimator()
    feed(estimator2, 100, 24 * 2 + 1)
    feed(estimator2, 140, 26, first.nextMs + 2000)
    expect(estimator2.getBpm()).toBeCloseTo(140, 1)
  })

  it('ignores out-of-range estimates', () => {
    const estimator = createClockBpmEstimator({ maxGapMs: 10000 })
    feed(estimator, 400, 30)
    expect(estimator.getBpm()).toBeNull()
  })
})

describe('getMIDIClockStatusMessage', () => {
  it('has a message for every failure state and none when fine/off', () => {
    expect(getMIDIClockStatusMessage('unsupported')).toMatch(/Chrome o Edge/)
    expect(getMIDIClockStatusMessage('denied')).toMatch(/permiso/)
    expect(getMIDIClockStatusMessage('no-inputs')).toMatch(/puerto MIDI/)
    expect(getMIDIClockStatusMessage('input-missing', 'loopMIDI Port')).toMatch(/loopMIDI Port/)
    expect(getMIDIClockStatusMessage('listening')).toBeNull()
    expect(getMIDIClockStatusMessage('disabled')).toBeNull()
    expect(getMIDIClockStatusMessage('requesting')).toBeNull()
  })
})
