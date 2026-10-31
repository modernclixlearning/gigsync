/**
 * Turning a chord name into the notes to play it with (pure): a bass note
 * (the root, or the slash bass) plus the chord in a close voicing around
 * middle C. Simple on purpose — enough to hear the harmony while playing
 * along, not an arrangement.
 */

import { parseChordString } from '~/lib/chordpro/transpose'

const NOTE_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** Lowest note of the chord voicing (G3); the root lands in G3–F#4. */
const VOICING_FLOOR = 55
/** Bass notes land in E2–D#3. */
const BASS_FLOOR = 40

/**
 * Intervals (semitones above the root) for a chord suffix. Unknown suffixes
 * fall back to the major or minor triad they start with.
 */
export function chordIntervals(suffix: string): number[] {
  const s = suffix.trim()
  const minor = /^(m(?!aj)|min|-)/.test(s)
  const body = s.replace(/^(min|m(?!aj)|-)/, '')

  let triad: number[]
  if (/^(dim|°|º|o(?![a-z]))/.test(s)) triad = [0, 3, 6]
  else if (/^(aug|\+)/.test(s)) triad = [0, 4, 8]
  else if (/sus2/.test(s)) triad = [0, 2, 7]
  else if (/sus4?/.test(s)) triad = [0, 5, 7]
  else triad = minor ? [0, 3, 7] : [0, 4, 7]

  // Half-diminished is its own shape whatever the prefix says (Bø = Bm7b5).
  const halfDiminished = /m7b5|ø/.test(s)
  const notes = new Set(halfDiminished ? [0, 3, 6, 10] : triad)
  if (!halfDiminished) {
    if (/^(dim|°|º)7/.test(s)) notes.add(9)
    else if (/maj7|M7|maj9|Δ/.test(body)) notes.add(11)
    else if (/(^|[^a-z])(7|9|11|13)/.test(body)) notes.add(10)
  }
  if (/(^|[^a-z#b])6/.test(body)) notes.add(9)
  if (/add9|(^|[^0-9b#])9|add2/.test(body)) notes.add(14)
  if (/b5/.test(s) && !/m7b5/.test(s)) {
    notes.delete(7)
    notes.add(6)
  }
  if (/#5/.test(s)) {
    notes.delete(7)
    notes.add(8)
  }
  return [...notes].sort((a, b) => a - b)
}

export interface ChordVoicing {
  /** MIDI pitch of the bass note. */
  bass: number
  /** MIDI pitches of the chord, close voicing. */
  chord: number[]
}

function pitchClass(note: string, accidental: string): number {
  return (NOTE_PC[note] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) + 12) % 12
}

/** Notes to play a chord name with, or null when it isn't a chord. */
export function voiceChord(name: string): ChordVoicing | null {
  const parsed = parseChordString(name.trim())
  if (!parsed) return null
  const root = pitchClass(parsed.root, parsed.accidental)
  const rootPitch = VOICING_FLOOR + ((root - VOICING_FLOOR % 12 + 12) % 12)
  const chord = chordIntervals(parsed.suffix).map((interval) => rootPitch + interval)
  const bassClass = parsed.bass ? pitchClass(parsed.bass.note, parsed.bass.accidental) : root
  const bass = BASS_FLOOR + ((bassClass - BASS_FLOOR % 12 + 12) % 12)
  return { bass, chord }
}
