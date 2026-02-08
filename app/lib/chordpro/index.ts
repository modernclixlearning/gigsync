/**
 * ChordPro Module
 * Centralized parsing, transposition, and utilities for ChordPro format
 */

// Types
export type {
  ChordPosition,
  ChordBar,
  LyricLine,
  SectionType,
  InstrumentalSection,
  ParsedLineType,
  ParsedLine,
  SectionLine,
  InstrumentalLine,
  LyricParsedLine,
  ChordsOnlyLine,
  EmptyLine,
  AnyParsedLine,
  ChordProDirectives,
  ParsedSong,
  ChordProSong,
  NoteName,
  Accidental,
  ChordSuffix,
  ParsedChord,
} from './types'

// Parser functions
export {
  parseChordPro,
  parseChordProLegacy,
  parseLine,
  parseDirective,
  parseChordPositions,
  stripChords,
  extractChords,
  isValidChord,
} from './parser'

// Transpose functions
export {
  transposeChord,
  transposeNote,
  transposeLine,
  parseChordString,
  chordToString,
  getInterval,
  NOTES_SHARP,
  NOTES_FLAT,
} from './transpose'

// Instrumental parsing
export {
  parseSectionHeader,
  parseChordBars,
  parseInstrumentalSection,
  createChordsOnlyLine,
  isInstrumentalSectionType,
  getSectionType,
  formatChordBars,
  isChordsOnlyLine,
} from './instrumental'
