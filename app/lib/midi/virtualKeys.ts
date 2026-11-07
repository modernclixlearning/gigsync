/**
 * The on-screen / computer-keyboard piano (pure): which computer key plays which
 * note, how an octave is drawn, and what to call a pitch.
 *
 * Two octaves are shown at once. The computer keys follow the usual DAW layout —
 * the Z row is the lower octave, the Q row the upper one:
 *
 *    2 3   5 6 7        upper octave   (black keys on the number row)
 *   Q W E R T Y U
 *    S D   G H J        lower octave   (black keys on the home row)
 *   Z X C V B N M
 *
 * Codes are `KeyboardEvent.code`, i.e. physical positions, so it works the same
 * on a QWERTY, AZERTY or Spanish layout.
 */

/** Lowest / highest octave the lower row can sit on (the upper row is one above). */
export const MIN_BASE_OCTAVE = 1
export const MAX_BASE_OCTAVE = 6
export const DEFAULT_BASE_OCTAVE = 3

/** Physical key for each semitone of an octave, C to B. */
export const LOWER_ROW_CODES = ['KeyZ', 'KeyS', 'KeyX', 'KeyD', 'KeyC', 'KeyV', 'KeyG', 'KeyB', 'KeyH', 'KeyN', 'KeyJ', 'KeyM'] as const
export const UPPER_ROW_CODES = ['KeyQ', 'Digit2', 'KeyW', 'Digit3', 'KeyE', 'KeyR', 'Digit5', 'KeyT', 'Digit6', 'KeyY', 'Digit7', 'KeyU'] as const

/** What to print on a key for each code. */
export function codeLabel(code: string): string {
  return code.replace(/^Key/, '').replace(/^Digit/, '')
}

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

/** MIDI pitch of C in an octave (C4 = 60). */
export const octaveStart = (octave: number): number => 12 * (octave + 1)

export const clampBaseOctave = (octave: number): number => Math.min(MAX_BASE_OCTAVE, Math.max(MIN_BASE_OCTAVE, Math.round(octave)))

/** «C4», «F#3». */
export function noteName(pitch: number): string {
  return `${NOTE_NAMES[((pitch % 12) + 12) % 12]}${Math.floor(pitch / 12) - 1}`
}

/** The pitch a computer key plays when the lower row sits on `baseOctave`, or null for other keys. */
export function pitchForCode(code: string, baseOctave: number): number | null {
  const lower = (LOWER_ROW_CODES as readonly string[]).indexOf(code)
  if (lower >= 0) return octaveStart(baseOctave) + lower
  const upper = (UPPER_ROW_CODES as readonly string[]).indexOf(code)
  if (upper >= 0) return octaveStart(baseOctave + 1) + upper
  return null
}

/** Computer key of a pitch, if it is one of the two visible octaves. */
export function codeForPitch(pitch: number, baseOctave: number): string | null {
  const offset = pitch - octaveStart(baseOctave)
  if (offset >= 0 && offset < 12) return LOWER_ROW_CODES[offset]
  if (offset >= 12 && offset < 24) return UPPER_ROW_CODES[offset - 12]
  return null
}

export interface OctaveKey {
  /** Semitone from C (0–11). */
  semitone: number
  black: boolean
  /** Left edge (white keys) or center (black keys), in % of the octave's width. */
  position: number
}

const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11]
/** Black keys sit on the border between the white keys they are named after. */
const BLACK_AFTER_WHITE: Record<number, number> = { 1: 1, 3: 2, 6: 4, 8: 5, 10: 6 }

/** The 7 white and 5 black keys of an octave, drawn left to right. */
export function octaveKeys(): { whites: OctaveKey[]; blacks: OctaveKey[] } {
  const width = 100 / 7
  const whites = WHITE_SEMITONES.map((semitone, i) => ({ semitone, black: false, position: i * width }))
  const blacks = Object.entries(BLACK_AFTER_WHITE).map(([semitone, after]) => ({
    semitone: Number(semitone),
    black: true,
    position: after * width,
  }))
  return { whites, blacks }
}

/**
 * Touch has no velocity: the lower on the key it is struck, the harder (like a
 * real key struck near its front). `ratio` is 0 at the top of the key, 1 at the bottom.
 */
export function velocityFromPosition(ratio: number): number {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0.5))
  return Math.round(50 + 70 * clamped)
}
