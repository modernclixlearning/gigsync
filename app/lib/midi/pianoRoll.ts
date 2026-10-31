/**
 * Piano-roll helpers for a recorded take (pure): note names, the pitch range
 * to draw, and quantizing notes to the click grid.
 */

import { PITCH_CLASS_NAMES } from '~/lib/audioAnalysis/chords'
import type { NoteEvent } from '~/lib/audioAnalysis/types'

const BLACK_KEYS = new Set([1, 3, 6, 8, 10])

/** "C4" for MIDI 60 (middle C), "Eb3" for 51. */
export function noteName(pitch: number): string {
  return `${PITCH_CLASS_NAMES[((pitch % 12) + 12) % 12]}${Math.floor(pitch / 12) - 1}`
}

export function isBlackKey(pitch: number): boolean {
  return BLACK_KEYS.has(((pitch % 12) + 12) % 12)
}

/**
 * Lowest and highest pitch to draw: the notes plus a little headroom, at least
 * `minSpan` semitones, starting on a C. Without notes, C3–C6.
 */
export function pitchRange(notes: NoteEvent[], minSpan = 24): { low: number; high: number } {
  if (notes.length === 0) return { low: 48, high: 84 }
  let low = Math.min(...notes.map((n) => n.pitchMidi)) - 2
  let high = Math.max(...notes.map((n) => n.pitchMidi)) + 2
  if (high - low < minSpan) {
    const grow = minSpan - (high - low)
    low -= Math.floor(grow / 2)
    high += Math.ceil(grow / 2)
  }
  low = Math.max(0, low - (((low % 12) + 12) % 12))
  return { low, high: Math.min(127, high) }
}

/**
 * Snap note starts and ends to the nearest multiple of `stepSeconds`; a note
 * never ends up shorter than one step.
 */
export function quantizeNotes(notes: NoteEvent[], stepSeconds: number): NoteEvent[] {
  if (!(stepSeconds > 0)) return notes
  const snap = (t: number) => Math.round(t / stepSeconds) * stepSeconds
  return notes.map((note) => {
    const start = Math.max(0, snap(note.startTimeSeconds))
    const end = Math.max(start + stepSeconds, snap(note.startTimeSeconds + note.durationSeconds))
    return { ...note, startTimeSeconds: start, durationSeconds: end - start }
  })
}
