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
 * @returns Transposed chord string
 */
export function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord

  const parsed = parseChordString(chord)
  if (!parsed) return chord

  // Detect if original uses flats
  const useFlats = parsed.accidental === 'b' || (parsed.bass?.accidental === 'b')

  // Transpose root
  const rootNote = parsed.root + parsed.accidental
  const newRoot = transposeNote(rootNote, semitones, useFlats)

  let result = newRoot + parsed.suffix

  // Transpose bass if present
  if (parsed.bass) {
    const bassNote = parsed.bass.note + parsed.bass.accidental
    const newBass = transposeNote(bassNote, semitones, useFlats)
    result += '/' + newBass
  }

  return result
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
export function transposeLine(line: string, semitones: number): string {
  if (semitones === 0) return line
  
  return line.replace(/\[([A-G][#b]?[^\]]*)\]/g, (_, chord) => {
    return `[${transposeChord(chord, semitones)}]`
  })
}
