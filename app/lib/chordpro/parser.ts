/**
 * ChordPro Parser
 * Centralized parsing for ChordPro format with extended syntax support
 */

import type {
  AnyParsedLine,
  ChordPosition,
  ChordProDirectives,
  ParsedSong,
  SectionLine,
  InstrumentalLine,
  LyricParsedLine,
  ChordsOnlyLine,
  EmptyLine,
  ChordProSong,
  LyricLine,
  DirectiveLine,
} from './types'

import { transposeChord } from './transpose'
import { 
  parseSectionHeader, 
  getSectionType, 
  isInstrumentalSectionType,
  parseChordBars,
  isValidChord,
  parseInstrumentalSection,
  createChordsOnlyLine,
} from './instrumental'

// Re-export for convenience
export { isValidChord, transposeChord }

// ============================================================================
// Directive Parsing
// ============================================================================

/** ChordPro directive regex: {directive: value} or {directive} */
const DIRECTIVE_REGEX = /^\{([^:}]+)(?::\s*(.+))?\}$/

/** Map of directive names to their normalized form */
const DIRECTIVE_MAP: Record<string, keyof ChordProDirectives> = {
  'title': 'title',
  't': 'title',
  'artist': 'artist',
  'a': 'artist',
  'key': 'key',
  'tempo': 'tempo',
  'bpm': 'tempo',
  'time': 'timeSignature',
  'capo': 'capo',
  'album': 'album',
  'year': 'year',
  'comment': 'comment',
  'c': 'comment',
}

/**
 * Parse a ChordPro directive line
 * @example "{title: My Song}" → { key: 'title', value: 'My Song' }
 */
export function parseDirective(line: string): { key: keyof ChordProDirectives; value: string } | null {
  const match = line.trim().match(DIRECTIVE_REGEX)
  if (!match) return null
  
  const [, directive, value = ''] = match
  const normalizedKey = DIRECTIVE_MAP[directive.toLowerCase()]
  
  if (!normalizedKey) return null
  
  return { key: normalizedKey, value: value.trim() }
}

// ============================================================================
// Line Parsing
// ============================================================================

/**
 * Parse chords from a line, returning chord positions and clean text
 */
export function parseChordPositions(line: string): { text: string; chords: ChordPosition[] } {
  const chordRegex = /\[([^\]]+)\]/g
  const chords: ChordPosition[] = []
  let cleanText = ''
  let lastIndex = 0
  let match
  
  while ((match = chordRegex.exec(line)) !== null) {
    const chordContent = match[1]
    
    // Check if it's a valid chord (not a section marker)
    if (isValidChord(chordContent)) {
      cleanText += line.slice(lastIndex, match.index)
      chords.push({
        chord: chordContent,
        position: cleanText.length
      })
      lastIndex = match.index + match[0].length
    }
  }
  
  cleanText += line.slice(lastIndex)
  
  return { text: cleanText, chords }
}

/**
 * Parse a single line of ChordPro text
 */
export function parseLine(line: string, transpose = 0): AnyParsedLine {
  const trimmed = line.trim()
  
  // Empty line
  if (trimmed === '') {
    return { type: 'empty', raw: line } as EmptyLine
  }
  
  // Check for ChordPro directive: {title: My Song}
  const directive = parseDirective(trimmed)
  if (directive) {
    return {
      type: 'directive',
      raw: line,
      directive: directive.key,
      value: directive.value
    } as DirectiveLine
  }
  
  // Check for section header (with or without bars)
  const sectionParsed = parseSectionHeader(trimmed)
  if (sectionParsed) {
    // Section with bars count: [Intro | 4 bars]
    if (sectionParsed.bars !== undefined) {
      const instrumental = parseInstrumentalSection(trimmed, [])
      if (instrumental) {
        return {
          type: 'instrumental',
          raw: line,
          section: instrumental
        } as InstrumentalLine
      }
    }
    
    // Simple section header: [Verse]
    return {
      type: 'section',
      raw: line,
      name: sectionParsed.name,
      sectionType: getSectionType(sectionParsed.name)
    } as SectionLine
  }
  
  // Check for chord-only line: Am | G | C | F |
  const chordsOnly = createChordsOnlyLine(trimmed)
  if (chordsOnly) {
    // Apply transpose to chords
    if (transpose !== 0) {
      chordsOnly.chordBars = chordsOnly.chordBars.map(bar => ({
        ...bar,
        chord: transposeChord(bar.chord, transpose)
      }))
    }
    return chordsOnly
  }
  
  // Regular lyric line with optional chords
  const { text, chords } = parseChordPositions(line)
  
  // Apply transpose
  const transposedChords = chords.map(c => ({
    ...c,
    chord: transposeChord(c.chord, transpose)
  }))
  
  return {
    type: 'lyric',
    raw: line,
    text: text || ' ', // Space for chord-only lines
    chords: transposedChords
  } as LyricParsedLine
}

// ============================================================================
// Full Song Parsing
// ============================================================================

/**
 * Parse a complete ChordPro document
 * @param text - Raw ChordPro text
 * @param transpose - Semitones to transpose (optional)
 */
export function parseChordPro(text: string, transpose = 0): ParsedSong {
  const lines = text.split('\n')
  const directives: ChordProDirectives = {}
  const parsedLines: AnyParsedLine[] = []
  
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Check for directive
    const directive = parseDirective(trimmed)
    if (directive) {
      if (directive.key === 'tempo') {
        directives[directive.key] = parseInt(directive.value, 10) || undefined
      } else if (directive.key === 'capo' || directive.key === 'year') {
        directives[directive.key] = parseInt(directive.value, 10) || undefined
      } else {
        (directives as any)[directive.key] = directive.value
      }
      i++
      continue
    }
    
    // Check for section with bars - collect subsequent chord lines
    const sectionParsed = parseSectionHeader(trimmed)
    if (sectionParsed && (sectionParsed.bars !== undefined || isInstrumentalSectionType(sectionParsed.name))) {
      // Look ahead for chord-only lines
      const subsequentLines: string[] = []
      let j = i + 1
      while (j < lines.length) {
        const nextLine = lines[j].trim()
        if (nextLine === '' || parseChordBars(nextLine)) {
          subsequentLines.push(nextLine)
          j++
        } else {
          break
        }
      }
      
      // If we found chord-only lines, create an instrumental section
      const chordLines = subsequentLines.filter(l => parseChordBars(l))
      if (chordLines.length > 0 || sectionParsed.bars !== undefined) {
        const instrumental = parseInstrumentalSection(trimmed, subsequentLines)
        if (instrumental) {
          // Apply transpose
          if (transpose !== 0) {
            instrumental.chordBars = instrumental.chordBars.map(bar => ({
              ...bar,
              chord: transposeChord(bar.chord, transpose)
            }))
          }
          parsedLines.push({
            type: 'instrumental',
            raw: line,
            section: instrumental
          } as InstrumentalLine)
          
          // Skip processed lines
          i = j
          continue
        }
      }
    }
    
    // Regular line parsing
    parsedLines.push(parseLine(line, transpose))
    i++
  }
  
  return { directives, lines: parsedLines }
}

/**
 * Parse to legacy ChordProSong format for backward compatibility
 */
export function parseChordProLegacy(text: string): ChordProSong {
  const lines = text.split('\n')
  const result: ChordProSong = {
    title: '',
    artist: '',
    lines: []
  }
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // Check for directive
    const directive = parseDirective(trimmed)
    if (directive) {
      if (directive.key === 'title') result.title = directive.value
      else if (directive.key === 'artist') result.artist = directive.value
      else if (directive.key === 'key') result.key = directive.value
      else if (directive.key === 'tempo') result.tempo = parseInt(directive.value, 10) || undefined
      else if (directive.key === 'timeSignature') result.timeSignature = directive.value
      continue
    }
    
    // Skip empty lines
    if (trimmed === '') continue
    
    // Skip section headers for legacy format
    if (parseSectionHeader(trimmed)) continue
    
    // Parse lyric line
    const { text, chords } = parseChordPositions(line)
    result.lines.push({ text, chords })
  }
  
  return result
}

/**
 * Strip all chord brackets from text, keeping only lyrics
 */
export function stripChords(text: string): string {
  return text.replace(/\[([^\]]+)\]/g, (match, content) => {
    return isValidChord(content) ? '' : match
  })
}

/**
 * Extract all unique chords from a song
 */
export function extractChords(text: string): string[] {
  const chordRegex = /\[([A-G][#b]?[^\]]*)\]/g
  const chords = new Set<string>()
  let match
  
  while ((match = chordRegex.exec(text)) !== null) {
    if (isValidChord(match[1])) {
      chords.add(match[1])
    }
  }
  
  return Array.from(chords)
}
