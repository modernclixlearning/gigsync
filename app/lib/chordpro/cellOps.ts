/**
 * Cell-level edits for a sung line in the chord editor.
 *
 * A lyric line is edited as a sequence of cells: cell i = chord i plus the
 * lyric text from its position up to the next chord. These helpers keep the
 * ChordPro invariants (positions sorted, inside the text) while moving or
 * inserting whole cells. Callers pass chords with explicit `beats` so the
 * line's rhythm survives the edit.
 */

import type { ChordPosition } from './types'

interface LyricCells {
  /** Text before the first chord (usually empty) */
  prefix: string
  /** Raw text of each cell, aligned with `chords` */
  texts: string[]
}

function splitCells(text: string, chords: ChordPosition[]): LyricCells {
  const prefix = chords.length > 0 ? text.slice(0, chords[0].position) : text
  const texts = chords.map((c, i) =>
    text.slice(c.position, i + 1 < chords.length ? chords[i + 1].position : text.length)
  )
  return { prefix, texts }
}

function joinCells(
  prefix: string,
  cells: { chord: ChordPosition; text: string }[]
): { text: string; chords: ChordPosition[] } {
  let text = prefix
  const chords = cells.map(({ chord, text: cellText }) => {
    const position = text.length
    text += cellText
    return { ...chord, position }
  })
  const trimmed = text.trimEnd()
  return {
    text: trimmed,
    chords: chords.map((c) => ({ ...c, position: Math.min(c.position, trimmed.length) })),
  }
}

/**
 * Move the whole cell `from` (chord + its lyric + its beats) to index `to`.
 */
export function moveLyricCell(
  text: string,
  chords: ChordPosition[],
  from: number,
  to: number
): { text: string; chords: ChordPosition[] } {
  const { prefix, texts } = splitCells(text, chords)
  const last = chords.length - 1
  const cells = chords.map((chord, i) => {
    // The line's last cell has no trailing space; give it one so it doesn't
    // glue onto the next word once it's no longer last (trimmed at the end).
    const t = texts[i]
    return { chord, text: i === last && t && !/\s$/.test(t) ? `${t} ` : t }
  })
  const [moved] = cells.splice(from, 1)
  cells.splice(to, 0, moved)
  return joinCells(prefix, cells)
}

/**
 * Replace the lyric of one cell. The editor shows the cell's text trimmed, so
 * the typed text replaces only the words: the whitespace that separated the
 * cell from its neighbours is kept (otherwise "near " + "mundo" would glue
 * into "near memundo"). A previously empty cell that isn't the last one gets
 * a separating space, so text typed into an inserted blank bar doesn't glue
 * onto the next word.
 */
export function replaceLyricCellText(
  text: string,
  chords: ChordPosition[],
  index: number,
  newText: string
): { text: string; chords: ChordPosition[] } {
  const { prefix, texts } = splitCells(text, chords)
  const orig = texts[index]
  const core = newText.trim()
  const lead = orig.match(/^\s*/)![0]
  let trail = orig.trim() ? orig.match(/\s*$/)![0] : orig
  const isLast = index === chords.length - 1
  if (core && !trail && !isLast && !orig.trim() && !/^\s/.test(texts[index + 1] ?? '')) {
    trail = ' '
  }
  const cells = chords.map((chord, i) => ({
    chord,
    text: i === index ? (core ? lead + core + trail : '') : texts[i],
  }))
  return joinCells(prefix, cells)
}

/**
 * Delete cells `from`..`to` (inclusive) as whole blocks: their chords, their
 * lyric text and their beats go away. The rest of the line keeps its rhythm.
 */
export function deleteLyricCells(
  text: string,
  chords: ChordPosition[],
  from: number,
  to: number
): { text: string; chords: ChordPosition[] } {
  const a = Math.max(0, Math.min(from, to))
  const b = Math.min(chords.length - 1, Math.max(from, to))
  const { prefix, texts } = splitCells(text, chords)
  const cells = chords
    .map((chord, i) => ({ chord, text: texts[i] }))
    .filter((_, i) => i < a || i > b)
  return joinCells(prefix, cells)
}

/**
 * Merge cells `from`..`to` (inclusive) into one: keeps the first cell's chord,
 * sums the beats, and joins the lyrics (the text itself is untouched — the
 * inner chord marks just go away). Inverse of subdividing a cell.
 */
export function mergeLyricCells(chords: ChordPosition[], from: number, to: number): ChordPosition[] {
  const a = Math.min(from, to)
  const b = Math.max(from, to)
  if (a === b || a < 0 || b >= chords.length) return chords
  const beats = chords.slice(a, b + 1).reduce((sum, c) => sum + (c.beats ?? 0), 0)
  return [...chords.slice(0, a), { ...chords[a], beats }, ...chords.slice(b + 1)]
}

/**
 * Insert an empty cell (no lyric) right after `index`, repeating that cell's
 * chord for `beats` beats.
 */
export function insertBlankLyricCell(
  text: string,
  chords: ChordPosition[],
  index: number,
  beats: number
): { text: string; chords: ChordPosition[] } {
  const { prefix, texts } = splitCells(text, chords)
  const cells = chords.map((chord, i) => ({ chord, text: texts[i] }))
  cells.splice(index + 1, 0, {
    chord: { chord: chords[index].chord, position: 0, beats },
    text: '',
  })
  return joinCells(prefix, cells)
}
