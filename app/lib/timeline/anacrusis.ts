/**
 * Anacrusis (pure): a song or intro that starts with an incomplete bar — `A 2 | A |`,
 * a first chord that lasts less than a bar and is followed by full bars. The
 * beats of that first bar are the *last* beats of a bar, so the bar lines of
 * everything that follows fall `offset` beats earlier than a count from the
 * start of the song would put them.
 *
 * The offset is how many beats are added to the position in the song to count
 * bars from its start: a bar begins where `(beat + offset) % beatsPerBar === 0`.
 * `A 2 | A |` in 4/4 has an offset of 2: the second A is the 1 of a bar, at
 * beat 2, then 6, 10…
 */

import type { TimelineElement } from '~/types/timeline'
import { chordCellBeats } from './chordEvents'

const EPSILON = 1e-6

/** `offset` rounded to the 16th note the rest of the player counts in. */
const roundToSixteenth = (beats: number) => Math.round(beats * 4) / 4

/**
 * The offset given the beats of the first chord cells, in order. The leading
 * cells that last less than a bar are the incomplete bar (a half bar followed
 * by another half bar fill it, so `F 2 | D 2 |` has no offset); what is
 * missing to reach the next bar line is the offset.
 */
export function anacrusisOffsetBeats(cellBeats: readonly number[], beatsPerBar: number): number {
  const perBar = Math.max(1, beatsPerBar)
  let leading = 0
  for (const beats of cellBeats) {
    if (!(beats > 0) || beats >= perBar - EPSILON) break
    leading += beats
  }
  if (leading <= 0) return 0
  const remainder = leading % perBar
  if (remainder < EPSILON || perBar - remainder < EPSILON) return 0
  return roundToSixteenth(perBar - remainder)
}

/**
 * The offset of a song's timeline: that of its first chord cells, when they
 * are an instrumental part or a line of chords (a lyric line that starts with
 * a levare is a different thing — see `pickupBeats`). 0 when there is none.
 */
export function timelineAnacrusisOffset(elements: readonly TimelineElement[] | null | undefined, beatsPerBar: number): number {
  for (const element of elements ?? []) {
    const cells = chordCellBeats(element, beatsPerBar)
    if (cells.length === 0) continue
    const type = element.content && 'type' in element.content ? element.content.type : null
    return type === 'instrumental' || type === 'chords-only' ? anacrusisOffsetBeats(cells, beatsPerBar) : 0
  }
  return 0
}

/**
 * Bar and beat (both 0-based) at `beat` of the song, counting bars from the
 * anacrusis. The incomplete bar is bar -1, so the first complete bar is bar 0
 * and, as a number, bar 1 on screen is the bar after it — like a score, where
 * the pickup measure does not count.
 */
export function barPositionAt(beat: number, offsetBeats: number, beatsPerBar: number): { bar: number; beatInBar: number } {
  const perBar = Math.max(1, Math.round(beatsPerBar))
  const shifted = Math.max(0, beat) + offsetBeats
  const bar = Math.floor(shifted / perBar + EPSILON) - (offsetBeats > 0 ? 1 : 0)
  const beatInBar = Math.floor((shifted % perBar) + EPSILON) % perBar
  return { bar, beatInBar }
}
