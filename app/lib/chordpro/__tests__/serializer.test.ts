/**
 * Integration tests for the ChordPro persistence pipeline (Fase 6)
 *
 * Verifies that beats set on ChordPosition survive the full round-trip:
 *   extend/subdivide → ChordPosition[] with beats
 *     → serializeParsedSong → ChordPro string with [chord:N]
 *       → parseChordPro → ChordPosition.beats preserved
 *         → IndexedDB stores/reloads the lyrics string unchanged
 *
 * These tests cover the portion of the pipeline that can be exercised
 * without a browser/IndexedDB environment.  The IndexedDB layer is
 * tested separately via the useSongs hook integration tests.
 */

import { describe, it, expect } from 'vitest'
import { parseChordPro } from '../parser'
import {
  serializeParsedSong,
  serializeLyricLine,
  serializeInstrumentalLine,
} from '../serializer'
import type { LyricParsedLine, InstrumentalLine, ChordPosition } from '../types'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Simulate the extend operation from LyricBarGrid (Fase 4). */
function extendChord(
  chords: ChordPosition[],
  index: number,
  gridResolution: number,
  defaultBeats = 4,
): ChordPosition[] {
  const cell = chords[index]
  const cellBeats = cell.beats ?? defaultBeats
  const next = chords[index + 1]

  if (next) {
    const nextBeats = next.beats ?? defaultBeats
    if (nextBeats - gridResolution < gridResolution) return chords // no-op
    return chords.map((c, i) => {
      if (i === index) return { ...c, beats: cellBeats + gridResolution }
      if (i === index + 1) return { ...c, beats: nextBeats - gridResolution }
      return c
    })
  }
  return chords.map((c, i) =>
    i === index ? { ...c, beats: cellBeats + gridResolution } : c,
  )
}

/** Simulate the subdivide operation from LyricBarGrid (Fase 4). */
function subdivideChord(
  chords: ChordPosition[],
  text: string,
  index: number,
  gridResolution: number,
  defaultBeats = 4,
): ChordPosition[] {
  const cell = chords[index]
  const cellBeats = cell.beats ?? defaultBeats
  if (cellBeats / 2 < gridResolution) return chords // no-op
  const halfBeats = cellBeats / 2
  const nextPos =
    index + 1 < chords.length ? chords[index + 1].position : text.length
  const midPos = Math.round((cell.position + nextPos) / 2)
  const newCell: ChordPosition = { chord: cell.chord, position: midPos, beats: halfBeats }
  return [
    ...chords.slice(0, index),
    { ...cell, beats: halfBeats },
    newCell,
    ...chords.slice(index + 1),
  ]
}

// ── serializeParsedSong — full-song round-trips ───────────────────────────────

describe('serializeParsedSong — full song with beats', () => {
  it('preserves beats in lyric lines across parse → serialize cycle', () => {
    const original = '[Verse]\n[Am:2]Hello [G:2]world'
    const parsed = parseChordPro(original)
    const serialized = serializeParsedSong(parsed.lines)
    expect(serialized).toBe(original)
  })

  it('preserves mixed beats/no-beats lines', () => {
    const original = '[Verse]\n[Am:2]Hello [G]world'
    const parsed = parseChordPro(original)
    const serialized = serializeParsedSong(parsed.lines)
    expect(serialized).toBe(original)
  })

  it('does not emit beats for plain chord lines', () => {
    const original = '[Verse]\n[Am]Hello [G]world'
    const parsed = parseChordPro(original)
    const serialized = serializeParsedSong(parsed.lines)
    expect(serialized).toBe(original)
  })

  it('preserves a full song with multiple sections and beats', () => {
    // Note: directives like {title:} are extracted into ParsedSong.directives,
    // not into ParsedSong.lines — so serializeParsedSong does not re-emit them.
    // The app stores title/artist as song fields, separate from song.lyrics.
    const original = [
      '[Verse]',
      '[Am:2]Hello [G:2]world',
      '[Chorus]',
      '[C:4]Sing it',
    ].join('\n')
    const parsed = parseChordPro(original)
    const serialized = serializeParsedSong(parsed.lines)
    expect(serialized).toBe(original)
  })
})

// ── Extend operation → serialize → re-parse ──────────────────────────────────

describe('extend operation pipeline: mutate → serialize → re-parse', () => {
  it('beat added by extend survives the full serialize→parse cycle', () => {
    // Start with a plain lyric line (no explicit beats)
    const lyrics = '[Am]Hello [G]world'
    const parsed = parseChordPro(lyrics)
    const lyricLine = parsed.lines[0] as LyricParsedLine

    // Extend chord 0 by gridResolution=0.25 (steals from chord 1)
    const newChords = extendChord(lyricLine.chords, 0, 0.25, 4)
    const mutated: LyricParsedLine = { ...lyricLine, chords: newChords }

    // Serialize
    const serialized = serializeLyricLine(mutated)
    expect(serialized).toContain(':4.25')
    expect(serialized).toContain(':3.75')

    // Re-parse
    const reparsed = parseChordPro(serialized)
    const reparsedLine = reparsed.lines[0] as LyricParsedLine
    expect(reparsedLine.chords[0].beats).toBeCloseTo(4.25)
    expect(reparsedLine.chords[1].beats).toBeCloseTo(3.75)
  })

  it('extending the last chord (no sibling) serializes and re-parses correctly', () => {
    const lyrics = '[Am]Hello [G]world'
    const parsed = parseChordPro(lyrics)
    const lyricLine = parsed.lines[0] as LyricParsedLine

    // Extend last chord (index 1) — no sibling, grows freely
    const newChords = extendChord(lyricLine.chords, 1, 0.5, 4)
    const mutated: LyricParsedLine = { ...lyricLine, chords: newChords }

    const serialized = serializeLyricLine(mutated)
    const reparsed = parseChordPro(serialized)
    const reparsedLine = reparsed.lines[0] as LyricParsedLine
    // Chord 0: no explicit beats → undefined
    expect(reparsedLine.chords[0].beats).toBeUndefined()
    // Chord 1: extended by 0.5 → 4.5
    expect(reparsedLine.chords[1].beats).toBeCloseTo(4.5)
  })
})

// ── Subdivide operation → serialize → re-parse ───────────────────────────────

describe('subdivide operation pipeline: mutate → serialize → re-parse', () => {
  it('subdivided cells (halved beats) survive the full serialize→parse cycle', () => {
    const text = 'Hello world ending'
    const lyrics = `[Am]${text}`
    const parsed = parseChordPro(lyrics)
    const lyricLine = parsed.lines[0] as LyricParsedLine

    // Subdivide chord 0 (beats defaults to 4 → half = 2)
    const newChords = subdivideChord(lyricLine.chords, text, 0, 0.25, 4)
    expect(newChords).toHaveLength(2)

    const mutated: LyricParsedLine = { ...lyricLine, chords: newChords }
    const serialized = serializeLyricLine(mutated)

    // Re-parse
    const reparsed = parseChordPro(serialized)
    const reparsedLine = reparsed.lines[0] as LyricParsedLine
    expect(reparsedLine.chords).toHaveLength(2)
    expect(reparsedLine.chords[0].chord).toBe('Am')
    expect(reparsedLine.chords[0].beats).toBeCloseTo(2)
    expect(reparsedLine.chords[1].chord).toBe('Am') // same chord
    expect(reparsedLine.chords[1].beats).toBeCloseTo(2)
  })

  it('subdivide at gridResolution minimum is a no-op', () => {
    const chords: ChordPosition[] = [{ chord: 'Am', position: 0, beats: 0.25 }]
    // gridResolution = 0.25, halfBeats = 0.125 < 0.25 → no-op
    const result = subdivideChord(chords, 'Hello', 0, 0.25, 4)
    expect(result).toHaveLength(1) // unchanged
    expect(result[0].beats).toBe(0.25)
  })
})

// ── Backward compatibility ────────────────────────────────────────────────────

describe('backward compatibility — songs without beats', () => {
  it('pre-existing song without beats parses and serializes identically', () => {
    const original = '[Verse]\n[Am]Hello world\n[Chorus]\n[C]Sing it loud'
    const parsed = parseChordPro(original)
    const serialized = serializeParsedSong(parsed.lines)
    expect(serialized).toBe(original)
    // No :N suffixes emitted
    expect(serialized).not.toMatch(/:\d/)
  })

  it('chords without explicit beats have beats === undefined after parse', () => {
    const parsed = parseChordPro('[Am]text')
    const lyricLine = parsed.lines[0] as LyricParsedLine
    expect(lyricLine.chords[0].beats).toBeUndefined()
  })
})

// ── InstrumentalSection beats ─────────────────────────────────────────────────

describe('InstrumentalSection beats — serialize → re-parse round-trip', () => {
  it('explicit bar beats survive serialize → parse for instrumental sections', () => {
    const line: InstrumentalLine = {
      type: 'instrumental',
      raw: '',
      section: {
        name: 'Intro',
        type: 'intro',
        bars: 4,
        chordBars: [
          { chord: 'Am', beats: 2 },
          { chord: 'Am', beats: 2 },
          { chord: 'G', beats: 4 },
          { chord: 'C', beats: 3.75 },
        ],
      },
    }
    const serialized = serializeInstrumentalLine(line)
    const reparsed = parseChordPro(serialized)
    // Find the instrumental line
    const instrLine = reparsed.lines.find(l => l.type === 'instrumental') as InstrumentalLine
    expect(instrLine).toBeDefined()
    expect(instrLine.section.chordBars[0].beats).toBe(2)
    expect(instrLine.section.chordBars[2].beats).toBe(4)
    expect(instrLine.section.chordBars[3].beats).toBeCloseTo(3.75)
  })
})
