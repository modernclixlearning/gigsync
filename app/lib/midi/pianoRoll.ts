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

/** Nearest multiple of `step` (or the one at/below, with `floor`). */
export function snapTime(time: number, step: number, floor = false): number {
  if (!(step > 0)) return time
  return (floor ? Math.floor(time / step + 1e-9) : Math.round(time / step)) * step
}

/**
 * A note dragged by `deltaSeconds` / `deltaPitch`: its start lands on the grid,
 * it keeps its length, and it stays within [0, ∞) and the pitch range.
 */
export function moveNote(
  note: NoteEvent,
  deltaSeconds: number,
  deltaPitch: number,
  step: number,
  range: { low: number; high: number },
): NoteEvent {
  return {
    ...note,
    startTimeSeconds: Math.max(0, snapTime(note.startTimeSeconds + deltaSeconds, step)),
    pitchMidi: Math.min(range.high, Math.max(range.low, note.pitchMidi + deltaPitch)),
  }
}

/** A note whose end was dragged by `deltaSeconds`: the end lands on the grid, at least one step after the start. */
export function resizeNote(note: NoteEvent, deltaSeconds: number, step: number): NoteEvent {
  const end = snapTime(note.startTimeSeconds + note.durationSeconds + deltaSeconds, step)
  return { ...note, durationSeconds: Math.max(step, end - note.startTimeSeconds) }
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
