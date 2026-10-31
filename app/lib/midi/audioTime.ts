/**
 * Map a MIDI event timestamp (performance.now() domain, ms — what
 * MIDIMessageEvent.timeStamp carries) to the AudioContext time whose sound is
 * *heard* at that same instant.
 *
 * Scheduling a click at the returned time makes it come out of the speakers
 * when the MIDI message arrived, so the browser's output latency is already
 * accounted for. The result is usually in the past by the time JS handles the
 * message — callers start the Transport "now" with an offset instead.
 */

export interface AudioClockLike {
  currentTime: number
  getOutputTimestamp?: () => { contextTime?: number; performanceTime?: number }
  outputLatency?: number
  baseLatency?: number
}

export interface AudioTimeMapper {
  (timestampMs: number, context: AudioClockLike, nowMs?: number): number
}

/** An output timestamp older than this (ms) is stale. */
const MAX_OUTPUT_TIMESTAMP_AGE_MS = 250

/**
 * The output timestamp is the precise source, but Chrome stops refreshing it
 * after a few seconds of silence (measured: 3.6 s old, mapping off by 10–20
 * ms) — exactly when a DAW Start arrives between songs. While it's fresh, the
 * mapper learns how far behind currentTime the heard audio is; when it's
 * stale, it maps from currentTime with that learned delay instead.
 */
export function createAudioTimeMapper(): AudioTimeMapper {
  let outputDelaySec: number | null = null

  return (timestampMs, context, nowMs = performance.now()) => {
    const output = context.getOutputTimestamp?.()
    // performanceTime is 0 until the output device has rendered something.
    if (
      output &&
      typeof output.contextTime === 'number' &&
      output.performanceTime &&
      Math.abs(nowMs - output.performanceTime) < MAX_OUTPUT_TIMESTAMP_AGE_MS
    ) {
      const heardNow = output.contextTime + (nowMs - output.performanceTime) / 1000
      const delay = context.currentTime - heardNow
      outputDelaySec = outputDelaySec === null ? delay : outputDelaySec * 0.9 + delay * 0.1
      return output.contextTime + (timestampMs - output.performanceTime) / 1000
    }
    // currentTime is being rendered now and heard after the output delay.
    const delay = outputDelaySec ?? (context.outputLatency || context.baseLatency || 0)
    return context.currentTime - (nowMs - timestampMs) / 1000 - delay
  }
}

/** One-off mapping, with no learned state (see createAudioTimeMapper). */
export function performanceTimeToAudioTime(
  timestampMs: number,
  context: AudioClockLike,
  nowMs: number = performance.now()
): number {
  return createAudioTimeMapper()(timestampMs, context, nowMs)
}
