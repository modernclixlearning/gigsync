/**
 * MIDI Clock parsing + BPM estimation (pure, no Web MIDI / React dependencies).
 *
 * MIDI Clock is a stream of 1-byte System Real-Time messages:
 * - 0xF8 Timing Clock — 24 per quarter note (24 PPQN)
 * - 0xFA Start        — start from the beginning of the song
 * - 0xFB Continue     — resume from the current position
 * - 0xFC Stop
 *
 * BPM is derived from the tick timestamps over a rolling window using a
 * least-squares fit (much less sensitive to per-tick jitter than measuring
 * the time between two single ticks), and is only re-emitted once per quarter
 * note and when it actually moved — so consumers (Tone.Transport, React state)
 * aren't thrashed 48 times per second.
 */

export const MIDI_TIMING_CLOCK = 0xf8
export const MIDI_START = 0xfa
export const MIDI_CONTINUE = 0xfb
export const MIDI_STOP = 0xfc

/** MIDI Clock resolution: ticks per quarter note. */
export const MIDI_CLOCK_PPQN = 24

export type MIDIRealtimeMessage = 'clock' | 'start' | 'continue' | 'stop'

/**
 * Classifies a raw MIDI message. Returns null for anything that isn't one of the
 * transport/clock real-time messages GigSync cares about (notes, CCs, active
 * sensing, SPP, MTC…).
 */
export function parseMIDIRealtimeMessage(
  data: ArrayLike<number> | null | undefined
): MIDIRealtimeMessage | null {
  if (!data || data.length === 0) return null
  switch (data[0]) {
    case MIDI_TIMING_CLOCK:
      return 'clock'
    case MIDI_START:
      return 'start'
    case MIDI_CONTINUE:
      return 'continue'
    case MIDI_STOP:
      return 'stop'
    default:
      return null
  }
}

/** BPM for a given average interval between clock ticks (ms). */
export function bpmFromTickInterval(intervalMs: number, ppqn: number = MIDI_CLOCK_PPQN): number {
  if (!(intervalMs > 0)) return 0
  return 60000 / (intervalMs * ppqn)
}

/**
 * Least-squares slope (ms per tick) of evenly-indexed timestamps.
 * Returns 0 when there aren't at least two points.
 */
export function regressionTickInterval(timestamps: readonly number[]): number {
  const n = timestamps.length
  if (n < 2) return 0
  const meanX = (n - 1) / 2
  let meanY = 0
  for (const t of timestamps) meanY += t
  meanY /= n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    const dx = i - meanX
    num += dx * (timestamps[i] - meanY)
    den += dx * dx
  }
  return den === 0 ? 0 : num / den
}

export interface ClockBpmEstimatorOptions {
  /** Max number of tick intervals kept in the rolling window. Default 192 (8 quarter notes). */
  windowTicks?: number
  /** Tick intervals needed before the first estimate. Default 24 (one quarter note). */
  minTicks?: number
  /** Re-evaluate (and possibly emit) every N ticks. Default 24 (once per quarter note). */
  evaluateEveryTicks?: number
  /** A gap longer than this (ms) between ticks resets the window (clock stopped/restarted). Default 500. */
  maxGapMs?: number
  /** Minimum change (BPM) required to emit a new value. Default 0.05. */
  changeThreshold?: number
  /** Emitted BPM is rounded to this step. Default 0.01. */
  precision?: number
  /**
   * When the last quarter note's tempo differs from the whole window by more
   * than this ratio, the DAW changed tempo: drop the older ticks so we follow
   * the new tempo right away instead of averaging it in. Default 0.03 (3%).
   */
  tempoJumpRatio?: number
  /** Estimates outside [minBpm, maxBpm] are ignored. */
  minBpm?: number
  maxBpm?: number
}

export interface ClockBpmEstimator {
  /**
   * Feed one Timing Clock tick (timestamp in ms, e.g. MIDIMessageEvent.timeStamp).
   * Returns the new BPM when it changed enough to be worth applying, otherwise null.
   */
  tick: (timestampMs: number) => number | null
  /** Forget the tick window (keeps the last emitted BPM). */
  reset: () => void
  /** Last emitted BPM, or null if none yet. */
  getBpm: () => number | null
}

const roundTo = (value: number, step: number): number => Math.round(value / step) * step

export function createClockBpmEstimator(options: ClockBpmEstimatorOptions = {}): ClockBpmEstimator {
  const {
    windowTicks = MIDI_CLOCK_PPQN * 8,
    minTicks = MIDI_CLOCK_PPQN,
    evaluateEveryTicks = MIDI_CLOCK_PPQN,
    maxGapMs = 500,
    changeThreshold = 0.05,
    precision = 0.01,
    tempoJumpRatio = 0.03,
    minBpm = 20,
    maxBpm = 300,
  } = options

  let timestamps: number[] = []
  let ticksSinceEvaluation = 0
  let bpm: number | null = null

  const reset = () => {
    timestamps = []
    ticksSinceEvaluation = 0
  }

  const tick = (timestampMs: number): number | null => {
    const last = timestamps[timestamps.length - 1]
    if (last !== undefined && (timestampMs - last > maxGapMs || timestampMs < last)) {
      reset()
    }

    timestamps.push(timestampMs)
    if (timestamps.length > windowTicks + 1) {
      timestamps.splice(0, timestamps.length - (windowTicks + 1))
    }
    ticksSinceEvaluation++

    const intervals = timestamps.length - 1
    if (intervals < minTicks) return null
    // First estimate goes out as soon as we have one quarter note; after that,
    // once per evaluation period.
    if (bpm !== null && ticksSinceEvaluation < evaluateEveryTicks) return null
    ticksSinceEvaluation = 0

    const recent = timestamps.slice(-(minTicks + 1))
    const recentBpm = bpmFromTickInterval((recent[recent.length - 1] - recent[0]) / minTicks)
    let estimate = bpmFromTickInterval(regressionTickInterval(timestamps))

    if (estimate > 0 && recentBpm > 0 && Math.abs(recentBpm - estimate) / estimate > tempoJumpRatio) {
      timestamps = recent
      estimate = recentBpm
    }

    if (!(estimate >= minBpm && estimate <= maxBpm)) return null

    const candidate = Number(roundTo(estimate, precision).toFixed(6))
    if (bpm === null || Math.abs(candidate - bpm) >= changeThreshold) {
      bpm = candidate
      return bpm
    }
    return null
  }

  return { tick, reset, getBpm: () => bpm }
}

export type MIDIClockSyncStatus =
  | 'disabled'
  | 'unsupported'
  | 'requesting'
  | 'denied'
  | 'no-inputs'
  | 'input-missing'
  | 'listening'

/**
 * User-facing (Spanish) message for a sync status. Null when there's nothing
 * worth telling the user (sync off, or working fine).
 */
export function getMIDIClockStatusMessage(
  status: MIDIClockSyncStatus,
  inputName?: string | null
): string | null {
  switch (status) {
    case 'unsupported':
      return 'Este navegador no soporta Web MIDI (usá Chrome o Edge). Se usa el BPM de la canción.'
    case 'denied':
      return 'No se dio permiso para acceder a MIDI. Se usa el BPM de la canción.'
    case 'no-inputs':
      return 'No hay ningún puerto MIDI de entrada. Se usa el BPM de la canción.'
    case 'input-missing':
      return `El puerto MIDI "${inputName ?? ''}" no está conectado. Se usa el BPM de la canción.`
    default:
      return null
  }
}
