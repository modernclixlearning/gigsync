/**
 * Chord Transposition Utilities
 * Transpose chords up or down by semitones
 */

import type { ParsedChord, NoteName, Accidental } from './types'

// ============================================================================
// Constants
// ============================================================================

/** Notes using sharps */
export const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

/** Notes using flats */
export const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

/** Mapping from flat to sharp equivalents */
const FLAT_TO_SHARP: Record<string, string> = {
  'Db': 'C#',
  'Eb': 'D#',
  'Gb': 'F#',
  'Ab': 'G#',
  'Bb': 'A#',
}

/** Mapping from sharp to flat equivalents (for display preference) */
const SHARP_TO_FLAT: Record<string, string> = {
  'C#': 'Db',
  'D#': 'Eb',
  'F#': 'Gb',
  'G#': 'Ab',
  'A#': 'Bb',
}

/**
 * Of the 5 chromatic pitch classes with two possible spellings, which one
 * has fewer accidentals as a major-key signature (e.g. Eb major = 3 flats
 * vs D# major = 9 sharps, so Eb reads as simpler/more legible). F#/Gb is a
 * genuine 6-vs-6 tie — defaults to sharp (F#), the more common guitar-chart
 * convention. Natural pitch classes (C, D, E, F, G, A, B) aren't ambiguous:
 * NOTES_SHARP and NOTES_FLAT already agree on their name.
 */
const AMBIGUOUS_PITCH_PREFERS_FLAT: Partial<Record<number, boolean>> = {
  1: true,  // Db over C#
  3: true,  // Eb over D#
  6: false, // F# over Gb (tie)
  8: true,  // Ab over G#
  10: true, // Bb over A#
}

/**
 * Default enharmonic spelling for a chromatic pitch (0-11), chosen to
 * minimize accidentals — the same logic that makes "transpose G to Bb"
 * read as 2 flats instead of "A#" (10 sharps' worth of key signature).
 */
export function defaultPrefersFlats(pitchIndex: number): boolean {
  return AMBIGUOUS_PITCH_PREFERS_FLAT[pitchIndex] ?? false
}

/** Whether a chromatic pitch (0-11) has two valid letter-name spellings. */
export function isAmbiguousPitch(pitchIndex: number): boolean {
  return pitchIndex in AMBIGUOUS_PITCH_PREFERS_FLAT
}

// ============================================================================
// Parsing
// ============================================================================

/**
 * Parse a chord string into its components
 * @example parseChordString('Am7') → { root: 'A', accidental: '', suffix: 'm7' }
 * @example parseChordString('F#m') → { root: 'F', accidental: '#', suffix: 'm' }
 * @example parseChordString('C/G') → { root: 'C', accidental: '', suffix: '', bass: { note: 'G', accidental: '' } }
 */
export function parseChordString(chord: string): ParsedChord | null {
  // Match: root note, optional accidental, suffix, optional bass note
  const match = chord.match(/^([A-G])([#b]?)([^/]*)?(?:\/([A-G])([#b]?))?$/)
  if (!match) return null

  const [, root, accidental, suffix = '', bassNote, bassAccidental] = match
  
  const result: ParsedChord = {
    root: root as NoteName,
    accidental: (accidental || '') as Accidental,
    suffix: suffix,
  }

  if (bassNote) {
    result.bass = {
      note: bassNote as NoteName,
      accidental: (bassAccidental || '') as Accidental,
    }
  }

  return result
}

/**
 * Convert a parsed chord back to string
 */
export function chordToString(chord: ParsedChord): string {
  let result = chord.root + chord.accidental + chord.suffix
  if (chord.bass) {
    result += '/' + chord.bass.note + chord.bass.accidental
  }
  return result
}

// ============================================================================
// Transposition
// ============================================================================

/**
 * Get the semitone index of a note (0-11)
 */
function getNoteIndex(note: string): number {
  // Normalize flats to sharps for consistent indexing
  const normalized = FLAT_TO_SHARP[note] || note
  return (NOTES_SHARP as readonly string[]).indexOf(normalized)
}

/**
 * Transpose a single note by semitones
 * @param note - Note with optional accidental (e.g., 'C', 'F#', 'Bb')
 * @param semitones - Number of semitones to transpose (positive = up, negative = down)
 * @param useFlats - Whether to prefer flats over sharps in output
 */
export function transposeNote(note: string, semitones: number, useFlats = false): string {
  const index = getNoteIndex(note)
  if (index === -1) return note

  const newIndex = ((index + semitones) % 12 + 12) % 12
  const noteArray = useFlats ? NOTES_FLAT : NOTES_SHARP
  return noteArray[newIndex]
}

/**
 * Transpose a chord by semitones
 * @param chord - Chord string (e.g., 'Am7', 'F#m', 'C/G')
 * @param semitones - Number of semitones to transpose
 * @param forceUseFlats - Override the enharmonic spelling for the whole
 *   chord (root + bass). When omitted, each note picks whichever spelling
 *   has fewer accidentals for its own resulting pitch (see defaultPrefersFlats).
 * @returns Transposed chord string
 */
export function transposeChord(chord: string, semitones: number, forceUseFlats?: boolean): string {
  if (semitones === 0 && forceUseFlats === undefined) return chord

  const parsed = parseChordString(chord)
  if (!parsed) return chord

  // Transpose root
  const rootNote = parsed.root + parsed.accidental
  const rootIndex = getNoteIndex(rootNote)
  if (rootIndex === -1) return chord
  const newRootIndex = ((rootIndex + semitones) % 12 + 12) % 12
  const rootUseFlats = forceUseFlats ?? defaultPrefersFlats(newRootIndex)
  const newRoot = rootUseFlats ? NOTES_FLAT[newRootIndex] : NOTES_SHARP[newRootIndex]

  let result = newRoot + parsed.suffix

  // Transpose bass if present
  if (parsed.bass) {
    const bassNote = parsed.bass.note + parsed.bass.accidental
    const bassIndex = getNoteIndex(bassNote)
    if (bassIndex !== -1) {
      const newBassIndex = ((bassIndex + semitones) % 12 + 12) % 12
      const bassUseFlats = forceUseFlats ?? defaultPrefersFlats(newBassIndex)
      const newBass = bassUseFlats ? NOTES_FLAT[newBassIndex] : NOTES_SHARP[newBassIndex]
      result += '/' + newBass
    } else {
      result += '/' + bassNote
    }
  }

  return result
}

/**
 * Chromatic pitch (0-11) a song's key lands on after transposing. Returns
 * -1 if `originalKey` isn't a recognizable note (e.g. empty/malformed).
 */
export function getTransposedPitchIndex(originalKey: string, semitones: number): number {
  const root = /m$/.test(originalKey) ? originalKey.slice(0, -1) : originalKey
  const index = getNoteIndex(root)
  if (index === -1) return -1
  return ((index + semitones) % 12 + 12) % 12
}

/**
 * Name of the key a song lands on after transposing, following the same
 * minimal-accidentals spelling as transposeChord (with the same manual
 * override). Preserves a trailing 'm' (minor) if present.
 * @example getTransposedKeyName('G', 3) → 'Bb'
 * @example getTransposedKeyName('F#m', 0, false) → 'F#m'
 */
export function getTransposedKeyName(originalKey: string, semitones: number, forceUseFlats?: boolean): string {
  const newIndex = getTransposedPitchIndex(originalKey, semitones)
  if (newIndex === -1) return originalKey

  const isMinor = /m$/.test(originalKey)
  const useFlats = forceUseFlats ?? defaultPrefersFlats(newIndex)
  const name = useFlats ? NOTES_FLAT[newIndex] : NOTES_SHARP[newIndex]
  return isMinor ? `${name}m` : name
}

/**
 * Get the interval between two notes in semitones
 * @param from - Source note (e.g., 'C', 'F#')
 * @param to - Target note (e.g., 'G', 'Bb')
 * @returns Number of semitones (0-11)
 */
export function getInterval(from: string, to: string): number {
  const fromIndex = getNoteIndex(from)
  const toIndex = getNoteIndex(to)
  if (fromIndex === -1 || toIndex === -1) return 0
  return ((toIndex - fromIndex) % 12 + 12) % 12
}

/**
 * Transpose all chords in a ChordPro line
 * @param line - Line with chords in brackets [Am] [G]
 * @param semitones - Number of semitones to transpose
 */
export function transposeLine(line: string, semitones: number, forceUseFlats?: boolean): string {
  if (semitones === 0 && forceUseFlats === undefined) return line

  return line.replace(/\[([A-G][#b]?[^\]]*)\]/g, (_, chord) => {
    return `[${transposeChord(chord, semitones, forceUseFlats)}]`
  })
}
