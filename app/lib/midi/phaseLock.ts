/**
 * Phase lock between a DAW's MIDI Clock and GigSync's Tone.Transport (pure).
 *
 * Following only the BPM derived from the clock keeps the tempo but not the
 * beat: the start latency and any small estimate error stay or accumulate.
 * The lock remembers the Transport position when the DAW started (or
 * continued), counts clock ticks from there, and once per quarter note says
 * where the Transport *should* be at that tick. The caller compares it with
 * where it actually is and applies `correctTempo`, which closes the gap over
 * the next beats by nudging the tempo (no jumps, so no skipped clicks).
 */

import { MIDI_CLOCK_PPQN } from './clock'

export interface PhaseLock {
  /** DAW sent Start/Continue: `startQuarter` is the Transport position (quarter notes) for the first tick. */
  start: (startQuarter: number) => void
  stop: () => void
  isLocked: () => boolean
  /**
   * Feed one Timing Clock tick. Every `evaluateEveryTicks` ticks (after the
   * first) returns the quarter the Transport should be at for this tick;
   * otherwise null.
   */
  tick: () => number | null
}

export function createPhaseLock(evaluateEveryTicks: number = MIDI_CLOCK_PPQN): PhaseLock {
  let startQuarter = 0
  // Index of the next tick since Start; -1 while not locked.
  let tickIndex = -1

  return {
    start: (quarter) => {
      startQuarter = quarter
      tickIndex = 0
    },
    stop: () => {
      tickIndex = -1
    },
    isLocked: () => tickIndex >= 0,
    tick: () => {
      if (tickIndex < 0) return null
      const index = tickIndex++
      if (index === 0 || index % evaluateEveryTicks !== 0) return null
      return startQuarter + index / MIDI_CLOCK_PPQN
    },
  }
}

export interface TempoCorrectionOptions {
  /**
   * Share of the phase error corrected over the next quarter note. Default
   * 0.8: measured lock noise is ~±1 ms, so a start error closes in 1–2 beats.
   */
  gain?: number
  /** Max tempo deviation from the DAW's BPM (ratio). Default 0.04 (4%). */
  maxCorrection?: number
}

/**
 * Tempo to run the Transport at so a phase error of `errorQuarters`
 * (positive = GigSync ahead of the DAW) shrinks over the next beat.
 */
export function correctTempo(
  dawBpm: number,
  errorQuarters: number,
  { gain = 0.8, maxCorrection = 0.04 }: TempoCorrectionOptions = {}
): number {
  const correction = Math.max(-maxCorrection, Math.min(maxCorrection, -gain * errorQuarters))
  return dawBpm * (1 + correction)
}
