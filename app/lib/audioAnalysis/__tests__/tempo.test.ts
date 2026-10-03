import { describe, it, expect } from 'vitest'
import {
  ENVELOPE_FPS,
  estimateBeatGrid,
  estimateTempo,
  mixEnvelopes,
  onsetEnvelopeFromEvents,
  onsetEnvelopeFromSamples,
} from '../tempo'
import type { OnsetEvent } from '../types'

function beatEvents(bpm: number, seconds: number, opts: { offset?: number; eighths?: boolean; accent?: number } = {}) {
  const { offset = 0.3, eighths = false, accent = 4 } = opts
  const period = 60 / bpm
  const events: OnsetEvent[] = []
  let i = 0
  for (let t = offset; t < seconds; t += period, i++) {
    events.push({ time: t, weight: i % accent === 0 ? 1 : 0.7 })
    if (eighths) events.push({ time: t + period / 2, weight: 0.3 })
  }
  return events
}

describe('estimateTempo (from onset events)', () => {
  it.each([72, 90, 100, 120, 128, 140, 150])('recovers %i BPM within ±1', bpm => {
    const env = onsetEnvelopeFromEvents(beatEvents(bpm, 30), 30)
    const tempo = estimateTempo(env)
    expect(tempo).not.toBeNull()
    expect(Math.abs(tempo!.bpm - bpm)).toBeLessThanOrEqual(1)
  })

  it('very fast tempos may come out at half speed (octave ambiguity — the UI offers ×2)', () => {
    const tempo = estimateTempo(onsetEnvelopeFromEvents(beatEvents(170, 30), 30))!
    const ok = [170, 85].some(t => Math.abs(tempo.bpm - t) <= 1)
    expect(ok).toBe(true)
  })

  it('is not fooled into double tempo by off-beat eighth notes', () => {
    const env = onsetEnvelopeFromEvents(beatEvents(110, 30, { eighths: true }), 30)
    const tempo = estimateTempo(env)!
    expect(Math.abs(tempo.bpm - 110)).toBeLessThanOrEqual(1)
  })

  it('tolerates small timing jitter', () => {
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 0.02
    const events = beatEvents(96, 40).map(e => ({ ...e, time: e.time + rand() }))
    const tempo = estimateTempo(onsetEnvelopeFromEvents(events, 40))!
    expect(Math.abs(tempo.bpm - 96)).toBeLessThanOrEqual(1)
  })

  it('returns null for silence or too-short input', () => {
    expect(estimateTempo(new Float32Array(3000))).toBeNull()
    expect(estimateTempo(onsetEnvelopeFromEvents(beatEvents(120, 1), 1))).toBeNull()
  })
})

describe('onsetEnvelopeFromSamples', () => {
  it('finds the tempo of a synthetic click track', () => {
    const sr = 8000
    const seconds = 20
    const bpm = 104
    const samples = new Float32Array(sr * seconds)
    for (let t = 0.2; t < seconds; t += 60 / bpm) {
      const start = Math.round(t * sr)
      for (let i = 0; i < 400 && start + i < samples.length; i++) {
        samples[start + i] = Math.sin((2 * Math.PI * 1000 * i) / sr) * Math.exp(-i / 80)
      }
    }
    const env = onsetEnvelopeFromSamples(samples, sr)
    expect(env.length).toBeGreaterThan(seconds * ENVELOPE_FPS * 0.95)
    const tempo = estimateTempo(env)!
    expect(Math.abs(tempo.bpm - bpm)).toBeLessThanOrEqual(1)
  })
})

describe('mixEnvelopes', () => {
  it('normalises each input and sums, padding to the longest', () => {
    const out = mixEnvelopes(Float32Array.from([0, 2, 4]), Float32Array.from([1, 0]))
    expect(Array.from(out)).toEqual([1, 0.5, 1])
  })
})

describe('estimateBeatGrid', () => {
  it('aligns beats to the onsets', () => {
    const env = onsetEnvelopeFromEvents(beatEvents(120, 10, { offset: 0.37 }), 10)
    const beats = estimateBeatGrid(env, 120)
    expect(beats.length).toBeGreaterThanOrEqual(18)
    expect(beats[0]).toBeCloseTo(0.37, 1)
    expect(beats[1] - beats[0]).toBeCloseTo(0.5, 2)
  })
})
