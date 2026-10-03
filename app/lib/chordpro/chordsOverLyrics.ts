/**
 * "Chords over lyrics" → ChordPro converter
 *
 * Most chord sites (Ultimate Guitar, Cifra Club, LaCuerda…) publish songs as
 * plain text where each chord line sits on top of the lyric line it belongs
 * to, aligned by column:
 *
 *   G         D/F#     Em
 *   Ella durmió al calor de las masas
 *
 * This module turns that layout into GigSync's inline ChordPro notation:
 *
 *   [G]Ella durmió al [D/F#]calor de [Em]las masas
 *
 * Rules:
 * - A chord line followed by a lyric line is merged into it, inserting each
 *   chord at its column (the lyric is padded with spaces when a chord sits
 *   past its end).
 * - A chord line with no lyric below it (intro, interlude, two chord lines in
 *   a row, end of text) becomes a chords-only bar line: `G | D | Em |`.
 * - Bar-style lines that are already valid GigSync syntax (`Am | G | C |`),
 *   section headers (`[Verse]`, `[Coro]`) and blank lines are kept as-is.
 *
 * Pure function: no DOM, no I/O.
 */

import { isChordsOnlyLine, isValidChord, parseSectionHeader } from './instrumental'

export interface ChordsOverLyricsResult {
  /** Converted ChordPro text (inline `[Chord]` notation). */
  chordPro: string
  /** Number of chord lines merged into the lyric line below them. */
  mergedLines: number
  /** Number of chord lines with no lyric below, emitted as bar lines. */
  chordOnlyLines: number
}

interface ChordToken {
  chord: string
  column: number
}

/** Tokens tolerated on a chord line besides chords (bar marks, repeats). */
const DECORATION_TOKEN = /^(\||-+|x\d+|\(x\d+\)|\d+x)$/i

const TAB_WIDTH = 4

/** Normalise a raw line: strip CR, NBSP → space, expand tabs, trim end. */
function normalizeLine(line: string): string {
  let out = ''
  for (const ch of line.replace(/\r/g, '').replace(/ /g, ' ')) {
    if (ch === '\t') {
      const spaces = TAB_WIDTH - (out.length % TAB_WIDTH)
      out += ' '.repeat(spaces)
    } else {
      out += ch
    }
  }
  return out.replace(/\s+$/, '')
}

/**
 * If `line` is a whitespace-separated chord line ("G   D/F#  Em"), return its
 * chords with their columns; otherwise null.
 */
export function parseChordLine(line: string): ChordToken[] | null {
  const tokens: ChordToken[] = []
  const re = /\S+/g
  let match: RegExpExecArray | null
  while ((match = re.exec(line)) !== null) {
    const token = match[0]
    if (isValidChord(token)) {
      tokens.push({ chord: token, column: match.index })
    } else if (!DECORATION_TOKEN.test(token)) {
      return null
    }
  }
  return tokens.length > 0 ? tokens : null
}

/** Insert chords into a lyric line at their columns. */
export function mergeChordsIntoLyric(chords: ChordToken[], lyric: string): string {
  let result = ''
  let cursor = 0
  let pastEnd = false
  for (const { chord, column } of chords) {
    if (column > lyric.length) {
      // Chord hangs past the end of the lyric: pad once to its column, then
      // keep subsequent trailing chords one space apart.
      result += pastEnd ? ' ' : lyric.slice(cursor) + ' '.repeat(column - lyric.length)
      cursor = lyric.length
      pastEnd = true
    } else {
      result += lyric.slice(cursor, column)
      cursor = column
    }
    result += `[${chord}]`
  }
  result += lyric.slice(cursor)
  return result.replace(/\s+$/, '')
}

function isSectionHeader(line: string): boolean {
  return parseSectionHeader(line) !== null
}

/** Already-valid GigSync bar line (`Am | G | C |`). Requires a `|`. */
function isBarLine(line: string): boolean {
  return line.includes('|') && isChordsOnlyLine(line)
}

function toBarLine(chords: ChordToken[]): string {
  return chords.map((c) => c.chord).join(' | ') + ' |'
}

/**
 * Convert a "chords over lyrics" sheet into ChordPro inline notation.
 */
export function convertChordsOverLyrics(input: string): ChordsOverLyricsResult {
  const lines = input.split('\n').map(normalizeLine)
  const output: string[] = []
  let mergedLines = 0
  let chordOnlyLines = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      output.push('')
      continue
    }

    if (isSectionHeader(trimmed) || isBarLine(trimmed)) {
      output.push(trimmed)
      continue
    }

    const chords = parseChordLine(line)
    if (!chords) {
      output.push(line)
      continue
    }

    const next = lines[i + 1]
    const nextIsLyric =
      next !== undefined &&
      next.trim() !== '' &&
      !isSectionHeader(next.trim()) &&
      !isBarLine(next.trim()) &&
      parseChordLine(next) === null

    if (nextIsLyric) {
      output.push(mergeChordsIntoLyric(chords, next))
      mergedLines++
      i++
    } else {
      output.push(toBarLine(chords))
      chordOnlyLines++
    }
  }

  // Trim leading/trailing blank lines, collapse runs of 3+ blanks.
  const chordPro = output
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '')

  return { chordPro, mergedLines, chordOnlyLines }
}
