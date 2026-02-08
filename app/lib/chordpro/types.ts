/**
 * ChordPro Parser Types
 * Centralized types for parsing and displaying lyrics with chords
 */

// ============================================================================
// Basic Types
// ============================================================================

/** Position of a chord within a line of text */
export interface ChordPosition {
  chord: string
  position: number // Character position in the text
}

/** A single bar/measure of music */
export interface ChordBar {
  chord: string
  beats?: number // Default: full bar based on time signature
}

/** A line of lyrics with optional chords */
export interface LyricLine {
  text: string
  chords: ChordPosition[]
  timestamp?: number
}

// ============================================================================
// Section Types
// ============================================================================

/** Types of sections in a song */
export type SectionType = 
  | 'verse' 
  | 'chorus' 
  | 'bridge' 
  | 'intro' 
  | 'outro' 
  | 'solo' 
  | 'instrumental' 
  | 'interlude'
  | 'pre-chorus'
  | 'post-chorus'
  | 'break'
  | 'other'

/** An instrumental section with bars and chord progression */
export interface InstrumentalSection {
  name: string
  type: SectionType
  bars: number
  chordBars: ChordBar[]
  repeatCount?: number
}

// ============================================================================
// Parsed Line Types
// ============================================================================

/** Types of parsed lines */
export type ParsedLineType = 
  | 'section'       // [Verse], [Chorus]
  | 'instrumental'  // [Intro | 4 bars] followed by chord bars
  | 'lyric'         // Regular line with text and optional chords
  | 'chords-only'   // Line with only chords (no lyrics)
  | 'directive'     // {title: My Song}, {capo: 2}
  | 'empty'         // Blank line

/** A parsed line from ChordPro text */
export interface ParsedLine {
  type: ParsedLineType
  raw: string // Original line text
}

/** Section header line: [Verse], [Chorus] */
export interface SectionLine extends ParsedLine {
  type: 'section'
  name: string
  sectionType: SectionType
}

/** Instrumental section with bars: [Intro | 4 bars] */
export interface InstrumentalLine extends ParsedLine {
  type: 'instrumental'
  section: InstrumentalSection
}

/** Line with lyrics and chords */
export interface LyricParsedLine extends ParsedLine {
  type: 'lyric'
  text: string
  chords: ChordPosition[]
}

/** Line with only chords (instrumental passage) */
export interface ChordsOnlyLine extends ParsedLine {
  type: 'chords-only'
  chordBars: ChordBar[]
  repeatCount?: number
}

/** Empty/blank line */
export interface EmptyLine extends ParsedLine {
  type: 'empty'
}

/** ChordPro directive: {title: My Song} */
export interface DirectiveLine extends ParsedLine {
  type: 'directive'
  directive: string
  value: string
}

/** Union of all parsed line types */
export type AnyParsedLine = 
  | SectionLine 
  | InstrumentalLine 
  | LyricParsedLine 
  | ChordsOnlyLine 
  | EmptyLine
  | DirectiveLine

// ============================================================================
// Song Types
// ============================================================================

/** Directives from ChordPro format */
export interface ChordProDirectives {
  title?: string
  artist?: string
  key?: string
  tempo?: number
  timeSignature?: string
  capo?: number
  album?: string
  year?: number
  comment?: string
}

/** A fully parsed ChordPro song */
export interface ParsedSong {
  directives: ChordProDirectives
  lines: AnyParsedLine[]
}

/** Legacy type for backward compatibility */
export interface ChordProSong {
  title: string
  artist: string
  key?: string
  tempo?: number
  timeSignature?: string
  lines: LyricLine[]
}

// ============================================================================
// Utility Types
// ============================================================================

/** Musical note names */
export type NoteName = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

/** Accidentals */
export type Accidental = '#' | 'b' | ''

/** Chord quality/type suffixes */
export type ChordSuffix = 
  | '' 
  | 'm' | 'min' | 'minor'
  | 'maj' | 'M' | 'major'
  | '7' | 'maj7' | 'm7' | 'min7'
  | '9' | 'maj9' | 'm9'
  | '11' | '13'
  | 'sus2' | 'sus4' | 'sus'
  | 'dim' | 'dim7'
  | 'aug' | '+'
  | 'add9' | 'add4'
  | '6' | 'm6'
  | string // Allow other suffixes

/** Parsed chord structure */
export interface ParsedChord {
  root: NoteName
  accidental: Accidental
  suffix: ChordSuffix
  bass?: {
    note: NoteName
    accidental: Accidental
  }
}
