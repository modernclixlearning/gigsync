/**
 * Steadies the tuner's reading (pure). The pitch detector gives a new, slightly
 * different number every frame — a string never rings at exactly one pitch,
 * and the detector jumps an octave now and then — so showing it raw makes the
 * needle shiver. This keeps what is *heard*:
 *
 *  - frames the detector is not sure of are ignored, and a short gap keeps the
 *    last reading on screen instead of blanking it;
 *  - the median of the last few readings throws out one-frame outliers;
 *  - it locks on to a note and stays on it until another one is clearly played
 *    (a margin beyond ±50 cents, and a few frames in a row);
 *  - the cents are smoothed: slow when you are close (the needle settles),
 *    fast when you are far (it follows the peg being turned).
 */

import type { NoteName } from '~/types/tuner'

export const NOTE_NAMES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export interface StabilizerOptions {
  /** Readings below this confidence (0–1) are ignored. */
  minConfidence: number
  /** Readings the median looks at. */
  medianSize: number
  /** Valid readings needed before anything is shown at all. */
  warmup: number
  /** Cents past the edge of the locked note before another note is considered. */
  switchMarginCents: number
  /** Frames in a row on the new note before the lock moves to it. */
  switchFrames: number
  /** How long the last reading stays up when the detector hears nothing (ms). */
  holdMs: number
  /** Within this many cents of the note, the needle sits dead centre. */
  centerCents: number
}

export const DEFAULT_STABILIZER_OPTIONS: StabilizerOptions = {
  minConfidence: 0.8,
  medianSize: 5,
  warmup: 3,
  switchMarginCents: 15,
  switchFrames: 4,
  holdMs: 400,
  centerCents: 1.5,
}

/** One frame of the detector: what it heard and how sure it is. */
export interface RawReading {
  frequency: number
  /** 0–1 */
  confidence: number
}

export interface StablePitch {
  frequency: number
  note: NoteName
  octave: number
  /** Whole cents from the note, -50 to +50. */
  cents: number
  confidence: number
}

export interface PitchStabilizer {
  /** Feed one frame (`null` = nothing heard); returns what to show, or null for nothing. */
  push: (reading: RawReading | null, now: number, referenceFrequency: number) => StablePitch | null
  reset: () => void
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = sorted.length >> 1
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

/** The note a semitone count from A4 stands for. */
export function semitoneToNote(semitonesFromA4: number): { note: NoteName; octave: number } {
  const rounded = Math.round(semitonesFromA4)
  return {
    note: NOTE_NAMES[(((rounded % 12) + 12 + 9) % 12)],
    octave: 4 + Math.floor((rounded + 9) / 12),
  }
}

export function createPitchStabilizer(overrides: Partial<StabilizerOptions> = {}): PitchStabilizer {
  const options = { ...DEFAULT_STABILIZER_OPTIONS, ...overrides }

  let recent: number[] = []
  let locked: number | null = null
  let smoothedCents = 0
  let candidate: { note: number; frames: number } | null = null
  let lastHeard = 0
  let lastOutput: StablePitch | null = null
  let reference = 0

  const reset = () => {
    recent = []
    locked = null
    smoothedCents = 0
    candidate = null
    lastOutput = null
  }

  const output = (confidence: number): StablePitch => {
    const cents = Math.abs(smoothedCents) < options.centerCents ? 0 : Math.max(-50, Math.min(50, Math.round(smoothedCents)))
    const exact = (locked as number) + smoothedCents / 100
    return {
      frequency: reference * 2 ** (exact / 12),
      ...semitoneToNote(locked as number),
      cents,
      confidence,
    }
  }

  const push: PitchStabilizer['push'] = (reading, now, referenceFrequency) => {
    // A different A4 makes every old reading meaningless.
    if (referenceFrequency !== reference) {
      reset()
      reference = referenceFrequency
    }

    const heard =
      reading !== null &&
      reading.confidence >= options.minConfidence &&
      reading.frequency > 0 &&
      Number.isFinite(reading.frequency)
    if (!heard) {
      if (lastOutput && now - lastHeard <= options.holdMs) return lastOutput
      reset()
      return null
    }

    lastHeard = now
    recent.push(12 * Math.log2(reading.frequency / reference))
    if (recent.length > options.medianSize) recent.shift()
    if (recent.length < options.warmup && locked === null) return null

    const steady = median(recent)
    if (locked === null) {
      locked = Math.round(steady)
      smoothedCents = (steady - locked) * 100
    } else {
      const away = (steady - locked) * 100
      if (Math.abs(away) <= 50 + options.switchMarginCents) {
        candidate = null
        // Settle slowly near the note, follow quickly when far from it.
        const delta = away - smoothedCents
        const gain = Math.abs(delta) > 20 ? 0.5 : Math.abs(delta) > 8 ? 0.25 : 0.12
        smoothedCents += gain * delta
      } else {
        const next = Math.round(steady)
        candidate = candidate && candidate.note === next ? { note: next, frames: candidate.frames + 1 } : { note: next, frames: 1 }
        if (candidate.frames >= options.switchFrames) {
          locked = next
          smoothedCents = (steady - next) * 100
          candidate = null
        }
      }
    }

    lastOutput = output(reading.confidence)
    return lastOutput
  }

  return { push, reset }
}
