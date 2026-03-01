/**
 * ChordPro Serializer
 * Converts parsed song data back to raw ChordPro text.
 * Used by the chord editor to persist changes made via drag-and-drop.
 */

import type {
  AnyParsedLine,
  ChordBar,
  ChordsOnlyLine,
  InstrumentalLine,
  LyricParsedLine,
} from './types'

// ============================================================================
// Per-line serializers
// ============================================================================

function serializeChordBar(bar: ChordBar): string {
  let s = bar.chord
  if (bar.beats !== undefined) {
    // Use integer if whole number, decimal otherwise (e.g. 0.5, 1.5)
    s += ` ${Number.isInteger(bar.beats) ? bar.beats : bar.beats}`
  }
  if (bar.label) {
    s += ` (${bar.label})`
  }
  return s
}

export function serializeChordsOnlyLine(line: ChordsOnlyLine): string {
  const parts = line.chordBars.map(serializeChordBar)
  let raw = parts.join(' | ') + ' |'
  if (line.repeatCount && line.repeatCount > 1) {
    raw += ` x${line.repeatCount}`
  }
  return raw
}

export function serializeInstrumentalLine(line: InstrumentalLine): string {
  const { section } = line
  // Header
  const barCount = section.bars
  const header = `[${section.name} | ${barCount} bars]`

  if (section.chordBars.length === 0) return header

  // Chord bars — group into rows of 4
  const rows: string[] = []
  const barsPerRow = 4
  for (let i = 0; i < section.chordBars.length; i += barsPerRow) {
    const slice = section.chordBars.slice(i, i + barsPerRow)
    let row = slice.map(serializeChordBar).join(' | ') + ' |'
    // Add repeat marker to last row
    if (
      i + barsPerRow >= section.chordBars.length &&
      section.repeatCount &&
      section.repeatCount > 1
    ) {
      row += ` x${section.repeatCount}`
    }
    rows.push(row)
  }

  return [header, ...rows].join('\n')
}

export function serializeLyricLine(line: LyricParsedLine): string {
  // Re-insert [Chord] markers at their character positions
  const { text, chords } = line
  if (chords.length === 0) return text

  let result = ''
  let lastPos = 0
  for (const cp of chords) {
    result += text.slice(lastPos, cp.position)
    result += `[${cp.chord}]`
    lastPos = cp.position
  }
  result += text.slice(lastPos)
  return result
}

/**
 * Serialize a single parsed line back to ChordPro text.
 */
export function serializeLine(line: AnyParsedLine): string {
  switch (line.type) {
    case 'empty':
      return ''
    case 'directive':
      return `{${line.directive}: ${line.value}}`
    case 'section':
      return `[${line.name}]`
    case 'chords-only':
      return serializeChordsOnlyLine(line)
    case 'instrumental':
      return serializeInstrumentalLine(line)
    case 'lyric':
      return serializeLyricLine(line)
  }
}

// ============================================================================
// Full-song serializer
// ============================================================================

/**
 * Rebuild the full ChordPro text from an array of parsed lines.
 * The `lineMap` maps original line indices (in `parsedLines`) to their
 * replacement. Lines not in the map are serialized as-is.
 *
 * NOTE: Instrumental sections occupy multiple raw lines (header + chord rows).
 * Those extra raw lines must be skipped; `rawLineCount` on the line object
 * is used for that (see the parser — instrumental lines store their raw span
 * via the raw string which we use as fallback).
 */
export function serializeParsedSong(lines: AnyParsedLine[]): string {
  return lines.map(serializeLine).join('\n')
}
