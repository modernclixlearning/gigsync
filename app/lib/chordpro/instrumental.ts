/**
 * Instrumental Section Parser
 * Parse extended syntax for instrumental passages:
 * - [Intro | 4 bars]
 * - Am | G | C | F |
 * - C | G | Am | F | x4
 */

import type { 
  ChordBar, 
  InstrumentalSection, 
  SectionType,
  ChordsOnlyLine 
} from './types'

// ============================================================================
// Constants
// ============================================================================

/** Known section types that are typically instrumental */
const INSTRUMENTAL_SECTION_TYPES: SectionType[] = [
  'intro', 'outro', 'solo', 'instrumental', 'interlude', 'break'
]

/** Regex patterns */
const PATTERNS = {
  /** Section with bars: [Intro | 4 bars] */
  sectionWithBars: /^\[([^|]+)\s*\|\s*(\d+)\s*bars?\s*\]$/i,
  
  /** Simple section: [Intro] */
  simpleSection: /^\[([^\]]+)\]$/,
  
  /** Chord bar separator */
  barSeparator: /\s*\|\s*/,
  
  /** Repeat marker at end: x4, x2, etc. */
  repeatMarker: /\s*x(\d+)\s*$/i,
  
  /** Valid chord pattern */
  chord: /^[A-G][#b]?(?:m(?:aj|in)?|maj|M|dim|aug|\+|sus[24]?|add[249]?|[0-9]+)*(?:\/[A-G][#b]?)?$/,
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse a section header with optional bar count
 * @example "[Intro | 4 bars]" → { name: "Intro", bars: 4 }
 * @example "[Solo]" → { name: "Solo", bars: undefined }
 */
export function parseSectionHeader(line: string): { name: string; bars?: number } | null {
  const trimmed = line.trim()
  
  // Try extended syntax first: [Section | N bars]
  const extendedMatch = trimmed.match(PATTERNS.sectionWithBars)
  if (extendedMatch) {
    return {
      name: extendedMatch[1].trim(),
      bars: parseInt(extendedMatch[2], 10)
    }
  }
  
  // Try simple section: [Section]
  const simpleMatch = trimmed.match(PATTERNS.simpleSection)
  if (simpleMatch) {
    const content = simpleMatch[1].trim()
    // Don't match if it looks like a chord
    if (!isValidChord(content)) {
      return { name: content }
    }
  }
  
  return null
}

/**
 * Determine if a section name is typically instrumental
 */
export function isInstrumentalSectionType(name: string): boolean {
  const normalized = name.toLowerCase().trim()
  return INSTRUMENTAL_SECTION_TYPES.some(type => 
    normalized.includes(type)
  )
}

/**
 * Get the section type from a section name
 */
export function getSectionType(name: string): SectionType {
  const normalized = name.toLowerCase().trim()
  
  if (normalized.includes('verse')) return 'verse'
  if (normalized.includes('chorus') || normalized.includes('estribillo')) return 'chorus'
  if (normalized.includes('bridge') || normalized.includes('puente')) return 'bridge'
  if (normalized.includes('intro')) return 'intro'
  if (normalized.includes('outro') || normalized.includes('ending')) return 'outro'
  if (normalized.includes('solo')) return 'solo'
  if (normalized.includes('instrumental')) return 'instrumental'
  if (normalized.includes('interlude') || normalized.includes('interludio')) return 'interlude'
  if (normalized.includes('pre-chorus') || normalized.includes('pre chorus')) return 'pre-chorus'
  if (normalized.includes('post-chorus') || normalized.includes('post chorus')) return 'post-chorus'
  if (normalized.includes('break')) return 'break'
  
  return 'other'
}

/**
 * Check if a string is a valid chord
 */
export function isValidChord(text: string): boolean {
  return PATTERNS.chord.test(text.trim())
}

/**
 * Parse a single chord-bar segment, supporting optional beat count and pickup label.
 *
 * Accepted formats:
 *   "Am"              → { chord: 'Am' }
 *   "F 3"             → { chord: 'F', beats: 3 }
 *   "F 3 (It's the)"  → { chord: 'F', beats: 3, label: "It's the" }
 *
 * Returns null if the segment cannot be parsed as a valid chord bar.
 */
function parseChordBarPart(part: string): ChordBar | null {
  let s = part.trim()
  if (!s) return null

  // Extract optional (label) at the end
  let label: string | undefined
  const labelMatch = s.match(/\(([^)]+)\)\s*$/)
  if (labelMatch) {
    label = labelMatch[1].trim()
    s = s.slice(0, labelMatch.index).trim()
  }

  // Split remainder into tokens: chord [beats]
  const tokens = s.split(/\s+/)
  if (tokens.length === 0 || !tokens[0]) return null

  const chord = tokens[0]
  if (!isValidChord(chord)) return null

  let beats: number | undefined
  if (tokens.length >= 2) {
    const n = parseFloat(tokens[1])
    // Must be a pure numeric token (integer or decimal, e.g. "2", "0.5", "1.5")
    if (!isNaN(n) && String(n) === tokens[1] && tokens.length === 2) {
      beats = n
    } else {
      // Unexpected extra tokens — not a valid chord bar part
      return null
    }
  }

  return { chord, ...(beats !== undefined && { beats }), ...(label && { label }) }
}

/**
 * Parse a line of chord bars: "Am | G | C | F |" or "Am | G | C | F | x4"
 * Supports partial-bar syntax: "F 3" (F for 3 beats) and pickup labels: "F 3 (It's the)"
 * @returns Array of chord bars and optional repeat count
 */
export function parseChordBars(line: string): { bars: ChordBar[]; repeatCount?: number } | null {
  let trimmed = line.trim()
  let repeatCount: number | undefined

  // Check for repeat marker at end
  const repeatMatch = trimmed.match(PATTERNS.repeatMarker)
  if (repeatMatch) {
    repeatCount = parseInt(repeatMatch[1], 10)
    trimmed = trimmed.replace(PATTERNS.repeatMarker, '').trim()
  }

  // Remove trailing bar separator if present
  if (trimmed.endsWith('|')) {
    trimmed = trimmed.slice(0, -1).trim()
  }

  // Split by bar separator
  const parts = trimmed.split(PATTERNS.barSeparator).filter(Boolean)

  if (parts.length === 0) return null

  // Parse each part as a chord bar (with optional beats/label)
  const bars: ChordBar[] = []
  for (const part of parts) {
    const bar = parseChordBarPart(part)
    if (bar) {
      bars.push(bar)
    } else if (part.trim()) {
      // Non-empty part that doesn't parse → not a chord-only line
      return null
    }
  }

  if (bars.length === 0) return null

  return { bars, repeatCount }
}

/**
 * Check if a line is a chord-only line (no lyrics, just chords separated by |)
 */
export function isChordsOnlyLine(line: string): boolean {
  const result = parseChordBars(line)
  return result !== null && result.bars.length > 0
}

/**
 * Parse a complete instrumental section from multiple lines
 * @param header - The section header line (e.g., "[Intro | 4 bars]")
 * @param subsequentLines - Lines following the header until next section
 */
export function parseInstrumentalSection(
  header: string, 
  subsequentLines: string[]
): InstrumentalSection | null {
  const headerParsed = parseSectionHeader(header)
  if (!headerParsed) return null
  
  const allChordBars: ChordBar[] = []
  let totalRepeat = 1
  
  // Parse subsequent chord-only lines
  for (const line of subsequentLines) {
    const parsed = parseChordBars(line)
    if (parsed) {
      // Apply repeat count
      const repeat = parsed.repeatCount || 1
      for (let i = 0; i < repeat; i++) {
        allChordBars.push(...parsed.bars)
      }
      if (parsed.repeatCount) {
        totalRepeat = parsed.repeatCount
      }
    } else if (line.trim()) {
      // Non-empty line that's not chord-only means end of instrumental section
      break
    }
  }
  
  return {
    name: headerParsed.name,
    type: getSectionType(headerParsed.name),
    bars: headerParsed.bars || allChordBars.length,
    chordBars: allChordBars,
    repeatCount: totalRepeat > 1 ? totalRepeat : undefined
  }
}

/**
 * Create a ChordsOnlyLine from parsed chord bars
 */
export function createChordsOnlyLine(line: string): ChordsOnlyLine | null {
  const parsed = parseChordBars(line)
  if (!parsed) return null
  
  return {
    type: 'chords-only',
    raw: line,
    chordBars: parsed.bars,
    repeatCount: parsed.repeatCount
  }
}

/**
 * Format chord bars back to string for display
 * @param bars - Array of chord bars
 * @param repeatCount - Optional repeat count
 * @param barsPerLine - How many bars per line (default: 4)
 */
export function formatChordBars(
  bars: ChordBar[], 
  repeatCount?: number,
  barsPerLine = 4
): string[] {
  const lines: string[] = []
  
  for (let i = 0; i < bars.length; i += barsPerLine) {
    const slice = bars.slice(i, i + barsPerLine)
    let line = slice.map(b => b.chord).join(' | ') + ' |'
    
    // Add repeat marker to last line if applicable
    if (i + barsPerLine >= bars.length && repeatCount && repeatCount > 1) {
      line += ` x${repeatCount}`
    }
    
    lines.push(line)
  }
  
  return lines
}
