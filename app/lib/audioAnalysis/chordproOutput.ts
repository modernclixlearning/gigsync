/**
 * Turn a detected progression into the app's existing ChordPro bar syntax
 * (the instrumental/bar-grid model: `[Name | N bars]` + `Am | G 2 | C 2 |`).
 *
 * Per-lyric alignment is out of scope (no reliable forced alignment client
 * side), so the progression is applied as its own section the user can then
 * move/copy in the bar-grid editor. Nothing here touches existing lyrics.
 */

import { isValidChord, parseChordBars } from '~/lib/chordpro'
import type { ChordProgression } from './types'

export const DETECTED_SECTION_NAME = 'Acordes detectados'

/**
 * Progression → chord-bar lines (no header). Unclear cells repeat the previous
 * chord so every cell stays a valid chord token. Half-bar cells are written
 * with an explicit beat count (`G 2`), full bars without.
 */
export function progressionToBarLines(progression: ChordProgression, barsPerLine = 4): string[] {
  const { bars, beatsPerBar } = progression
  const lines: string[] = []
  let previous: string | null = null
  let current: string[] = []
  bars.forEach((bar, i) => {
    for (const cell of bar.cells) {
      const chord = cell.chord ?? previous ?? firstChord(progression)
      if (!chord) continue
      previous = chord
      current.push(cell.beats === beatsPerBar ? chord : `${chord} ${cell.beats}`)
    }
    if ((i + 1) % barsPerLine === 0 || i === bars.length - 1) {
      if (current.length > 0) lines.push(current.join(' | ') + ' |')
      current = []
    }
  })
  return lines
}

function firstChord(progression: ChordProgression): string | null {
  for (const bar of progression.bars) {
    for (const cell of bar.cells) if (cell.chord) return cell.chord
  }
  return null
}

export interface ParsedBarText {
  lines: string[]
  /** Total bars, counting partial cells by their beats. */
  barCount: number
  /** 1-based line numbers that are not valid chord-bar lines. */
  invalidLines: number[]
}

/**
 * Validate user-edited chord-bar text (one `Am | G | C | F |` line per row).
 * Blank lines are ignored.
 */
export function parseBarText(text: string, beatsPerBar: number): ParsedBarText {
  const lines: string[] = []
  const invalidLines: number[] = []
  let beats = 0
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return
    const parsed = parseChordBars(line)
    if (!parsed || parsed.bars.some(b => !isValidChord(b.chord))) {
      invalidLines.push(i + 1)
      return
    }
    lines.push(line)
    const lineBeats = parsed.bars.reduce((s, b) => s + (b.beats ?? beatsPerBar), 0)
    beats += lineBeats * (parsed.repeatCount ?? 1)
  })
  return { lines, barCount: Math.round(beats / Math.max(1, beatsPerBar)), invalidLines }
}

/** Header + bar lines, ready to append to the song's ChordPro. */
export function buildDetectedSection(lines: string[], barCount: number): string {
  return [`[${DETECTED_SECTION_NAME} | ${barCount} bars]`, ...lines].join('\n')
}

/**
 * Append a section to existing lyrics without modifying them: the block is
 * added after a blank line at the end.
 */
export function appendSection(lyrics: string, section: string): string {
  const trimmed = lyrics.replace(/\s+$/, '')
  return trimmed ? `${trimmed}\n\n${section}\n` : `${section}\n`
}

/** Beats per bar from a time-signature string like "4/4" or "6/8". */
export function beatsPerBarFromTimeSignature(timeSignature: string | undefined): number {
  const n = parseInt((timeSignature ?? '').split('/')[0], 10)
  return Number.isFinite(n) && n > 0 && n <= 16 ? n : 4
}
