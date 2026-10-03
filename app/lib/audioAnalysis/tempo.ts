/**
 * Tempo (BPM) and beat-grid estimation — pure functions, no Web Audio / tfjs.
 *
 * Approach (classic onset-autocorrelation):
 *  1. Build an onset-strength envelope sampled at `ENVELOPE_FPS`, either from
 *     transcribed note onsets (`onsetEnvelopeFromEvents`) or from the raw
 *     audio (`onsetEnvelopeFromSamples`, energy flux — catches drums, which
 *     basic-pitch does not transcribe). Both can be mixed with `mixEnvelopes`.
 *  2. Autocorrelate the envelope over the lag range of [minBpm, maxBpm],
 *     weighted by a log-normal prior centred on `preferredBpm` (reduces
 *     half/double-tempo errors), then refine the period with a fine comb search.
 *  3. `estimateBeatGrid` picks the phase whose comb best lines up with onsets.
 */

import type { OnsetEvent, TempoEstimate } from './types'

export const ENVELOPE_FPS = 100

export interface TempoOptions {
  minBpm?: number
  maxBpm?: number
  /** Centre of the tempo prior (BPM). */
  preferredBpm?: number
  /** Width of the prior in octaves (1 = one doubling). */
  priorOctaves?: number
}

const DEFAULTS: Required<TempoOptions> = {
  minBpm: 50,
  maxBpm: 220,
  preferredBpm: 115,
  priorOctaves: 1,
}

/**
 * Impulse-train envelope from point onsets. Each onset is spread over a few
 * frames with a small Gaussian so slightly late/early onsets still correlate.
 */
export function onsetEnvelopeFromEvents(
  events: OnsetEvent[],
  durationSeconds: number,
  fps = ENVELOPE_FPS,
): Float32Array {
  const length = Math.max(1, Math.ceil(durationSeconds * fps) + 1)
  const env = new Float32Array(length)
  const kernel = [0.25, 0.6, 1, 0.6, 0.25]
  const half = Math.floor(kernel.length / 2)
  for (const { time, weight } of events) {
    if (!(weight > 0) || time < 0) continue
    const centre = Math.round(time * fps)
    for (let k = 0; k < kernel.length; k++) {
      const i = centre + k - half
      if (i >= 0 && i < length) env[i] += weight * kernel[k]
    }
  }
  return env
}

/**
 * Onset-strength envelope straight from mono PCM: half-wave-rectified flux of
 * the log-energy in short frames, with the local mean removed. Cheap, and
 * percussive enough to pick up drums and strums.
 */
export function onsetEnvelopeFromSamples(
  samples: Float32Array,
  sampleRate: number,
  fps = ENVELOPE_FPS,
): Float32Array {
  const hop = Math.max(1, Math.round(sampleRate / fps))
  const win = hop * 2
  const frames = Math.max(1, Math.floor(samples.length / hop))
  const logEnergy = new Float32Array(frames)
  for (let f = 0; f < frames; f++) {
    const start = f * hop
    const end = Math.min(samples.length, start + win)
    let sum = 0
    for (let i = start; i < end; i++) sum += samples[i] * samples[i]
    logEnergy[f] = Math.log(1e-10 + sum / Math.max(1, end - start))
  }
  const flux = new Float32Array(frames)
  for (let f = 1; f < frames; f++) {
    flux[f] = Math.max(0, logEnergy[f] - logEnergy[f - 1])
  }
  return subtractLocalMean(flux, Math.round(fps / 2))
}

function subtractLocalMean(x: Float32Array, radius: number): Float32Array {
  const out = new Float32Array(x.length)
  // prefix sums for an O(n) moving average
  const prefix = new Float64Array(x.length + 1)
  for (let i = 0; i < x.length; i++) prefix[i + 1] = prefix[i] + x[i]
  for (let i = 0; i < x.length; i++) {
    const a = Math.max(0, i - radius)
    const b = Math.min(x.length, i + radius + 1)
    const mean = (prefix[b] - prefix[a]) / (b - a)
    out[i] = Math.max(0, x[i] - mean)
  }
  return out
}

/** Normalise each envelope to unit max and sum them (lengths may differ). */
export function mixEnvelopes(...envelopes: Float32Array[]): Float32Array {
  const length = Math.max(0, ...envelopes.map(e => e.length))
  const out = new Float32Array(length)
  for (const env of envelopes) {
    let max = 0
    for (let i = 0; i < env.length; i++) if (env[i] > max) max = env[i]
    if (max <= 0) continue
    for (let i = 0; i < env.length; i++) out[i] += env[i] / max
  }
  return out
}

/** Linear-interpolated read of the envelope at a fractional frame. */
function sampleAt(env: Float32Array, pos: number): number {
  if (pos < 0 || pos > env.length - 1) return 0
  const i = Math.floor(pos)
  const t = pos - i
  return i + 1 < env.length ? env[i] * (1 - t) + env[i + 1] * t : env[i]
}

/** Best phase (in frames) and its comb energy for a given period. */
function bestPhase(env: Float32Array, period: number): { phase: number; energy: number } {
  let best = { phase: 0, energy: -Infinity }
  const steps = Math.max(1, Math.ceil(period))
  for (let p = 0; p < steps; p++) {
    let energy = 0
    let n = 0
    for (let pos = p; pos < env.length; pos += period) {
      energy += sampleAt(env, pos)
      n++
    }
    const norm = n > 0 ? energy / n : 0
    if (norm > best.energy) best = { phase: p, energy: norm }
  }
  return best
}

/**
 * Estimate the tempo of an onset envelope.
 * @returns null when the envelope has no usable periodicity (silence, too short).
 */
export function estimateTempo(
  envelope: Float32Array,
  fps = ENVELOPE_FPS,
  options: TempoOptions = {},
): TempoEstimate | null {
  const { minBpm, maxBpm, preferredBpm, priorOctaves } = { ...DEFAULTS, ...options }
  const n = envelope.length
  const minLag = Math.max(1, Math.floor((60 * fps) / maxBpm))
  const maxLag = Math.ceil((60 * fps) / minBpm)
  if (n < maxLag * 2) return null

  let mean = 0
  for (let i = 0; i < n; i++) mean += envelope[i]
  mean /= n
  const x = new Float32Array(n)
  let energy = 0
  for (let i = 0; i < n; i++) {
    x[i] = envelope[i] - mean
    energy += x[i] * x[i]
  }
  if (energy <= 1e-9) return null

  const ac = new Float64Array(maxLag + 2)
  for (let lag = minLag - 1; lag <= maxLag + 1; lag++) {
    if (lag < 1) continue
    let sum = 0
    for (let i = 0; i + lag < n; i++) sum += x[i] * x[i + lag]
    // unbiased: compensate for the shrinking overlap
    ac[lag] = sum / (n - lag)
  }

  let bestLag = -1
  let bestScore = -Infinity
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (ac[lag] <= 0) continue
    // local maximum only
    if (ac[lag] < ac[lag - 1] || ac[lag] < ac[lag + 1]) continue
    const bpm = (60 * fps) / lag
    const octaves = Math.log2(bpm / preferredBpm)
    const prior = Math.exp(-0.5 * (octaves / priorOctaves) ** 2)
    const score = ac[lag] * prior
    if (score > bestScore) {
      bestScore = score
      bestLag = lag
    }
  }
  if (bestLag < 0) return null

  // Parabolic interpolation around the autocorrelation peak.
  const a = ac[bestLag - 1]
  const b = ac[bestLag]
  const c = ac[bestLag + 1]
  const denom = a - 2 * b + c
  let period = bestLag + (denom !== 0 ? (0.5 * (a - c)) / denom : 0)

  // Fine comb refinement within ±3% of the period: the whole-track comb is far
  // more precise than a single autocorrelation lag at 100 fps.
  let bestEnergy = bestPhase(envelope, period).energy
  const lo = period * 0.97
  const hi = period * 1.03
  const step = Math.max(0.01, period / 2000)
  for (let p = lo; p <= hi; p += step) {
    const { energy: e } = bestPhase(envelope, p)
    if (e > bestEnergy + 1e-12) {
      bestEnergy = e
      period = p
    }
  }

  const bpm = (60 * fps) / period
  const confidence = Math.max(0, Math.min(1, ac[bestLag] / (energy / n)))
  return { bpm: Math.round(bpm * 10) / 10, confidence }
}

/**
 * Beat times (seconds) for a known BPM, aligned to the envelope's strongest
 * comb phase and spanning the whole envelope.
 */
export function estimateBeatGrid(
  envelope: Float32Array,
  bpm: number,
  fps = ENVELOPE_FPS,
): number[] {
  if (!(bpm > 0) || envelope.length === 0) return []
  const period = (60 * fps) / bpm
  const { phase } = bestPhase(envelope, period)
  const beats: number[] = []
  for (let pos = phase; pos < envelope.length; pos += period) beats.push(pos / fps)
  return beats
}

/** Note onsets → weighted onset events (louder notes count more). */
export function noteOnsets(
  notes: { startTimeSeconds: number; amplitude: number }[],
): OnsetEvent[] {
  return notes.map(n => ({ time: n.startTimeSeconds, weight: n.amplitude }))
}
