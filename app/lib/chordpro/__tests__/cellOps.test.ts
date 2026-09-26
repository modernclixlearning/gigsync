import { describe, it, expect } from 'vitest'
import {
  moveLyricCell,
  insertBlankLyricCell,
  mergeLyricCells,
  deleteLyricCells,
  replaceLyricCellText,
} from '../cellOps'
import { parseChordPro } from '../parser'
import { serializeParsedSong } from '../serializer'
import type { LyricParsedLine } from '../types'

function line(src: string): LyricParsedLine {
  return parseChordPro(src).lines[0] as LyricParsedLine
}

function toChordPro(text: string, chords: LyricParsedLine['chords']): string {
  return serializeParsedSong([{ type: 'lyric', text, chords, raw: '' }])
}

describe('moveLyricCell', () => {
  it('moves chord, lyric and beats together', () => {
    const l = line('[D:4]Every night [Bm:2]in my [G:2]dreams')
    const r = moveLyricCell(l.text, l.chords, 2, 0)
    expect(toChordPro(r.text, r.chords)).toBe('[G:2]dreams [D:4]Every night [Bm:2]in my')
  })

  it('moves a cell to the end without leaving a trailing space', () => {
    const l = line('[D:4]Every night [Bm:2]in my [G:2]dreams')
    const r = moveLyricCell(l.text, l.chords, 0, 2)
    expect(toChordPro(r.text, r.chords)).toBe('[Bm:2]in my [G:2]dreams [D:4]Every night')
  })

  it('keeps an empty cell empty', () => {
    const l = line('[D:4]Hola [A:4][G:4]mundo')
    const r = moveLyricCell(l.text, l.chords, 1, 0)
    expect(toChordPro(r.text, r.chords)).toBe('[A:4][D:4]Hola [G:4]mundo')
  })
})

describe('replaceLyricCellText', () => {
  it('keeps the space that separates the cell from the next one', () => {
    const l = line('[D:4]near [G:4]mundo')
    const r = replaceLyricCellText(l.text, l.chords, 0, 'near me now')
    expect(toChordPro(r.text, r.chords)).toBe('[D:4]near me now [G:4]mundo')
  })

  it('does not add a space inside a word split by a chord', () => {
    const l = line('[D:4]dre[G:4]ams')
    const r = replaceLyricCellText(l.text, l.chords, 0, 'drea')
    expect(toChordPro(r.text, r.chords)).toBe('[D:4]drea[G:4]ams')
  })

  it('separates text typed into an inserted blank bar from the next word', () => {
    const l = line('[D:4]Hola [D:4][G:4]mundo')
    const r = replaceLyricCellText(l.text, l.chords, 1, 'que tal')
    expect(toChordPro(r.text, r.chords)).toBe('[D:4]Hola [D:4]que tal [G:4]mundo')
  })

  it('edits the last cell without a trailing space', () => {
    const l = line('[D:4]Hola [G:4]mundo')
    const r = replaceLyricCellText(l.text, l.chords, 1, 'mundo cruel')
    expect(toChordPro(r.text, r.chords)).toBe('[D:4]Hola [G:4]mundo cruel')
  })

  it('clearing a cell leaves it empty', () => {
    const l = line('[D:4]Hola [G:4]mundo')
    const r = replaceLyricCellText(l.text, l.chords, 0, '  ')
    expect(toChordPro(r.text, r.chords)).toBe('[D:4][G:4]mundo')
  })
})

describe('deleteLyricCells', () => {
  it('removes a run of cells with their lyric and beats', () => {
    const l = line('[D:4]Every night [Bm:2]in my [A:2]own [G:4]dreams')
    const r = deleteLyricCells(l.text, l.chords, 1, 2)
    expect(toChordPro(r.text, r.chords)).toBe('[D:4]Every night [G:4]dreams')
  })

  it('removes trailing cells without leaving a trailing space', () => {
    const l = line('[D:4]Hola [G:4]mundo [A:4]cruel')
    const r = deleteLyricCells(l.text, l.chords, 2, 1)
    expect(toChordPro(r.text, r.chords)).toBe('[D:4]Hola')
  })

  it('removes leading cells', () => {
    const l = line('[D:4]Hola [G:4]mundo [A:4]cruel')
    const r = deleteLyricCells(l.text, l.chords, 0, 1)
    expect(toChordPro(r.text, r.chords)).toBe('[A:4]cruel')
  })
})

describe('mergeLyricCells', () => {
  it('undoes a subdivision: one cell, first chord, summed beats, joined lyric', () => {
    const l = line('[D:2]Every [D:2]night [G:4]dreams')
    const merged = mergeLyricCells(l.chords, 0, 1)
    expect(toChordPro(l.text, merged)).toBe('[D:4]Every night [G:4]dreams')
  })

  it('merges a range in either direction', () => {
    const l = line('[C:1]a [D:1]b [E:2]c [F:4]d')
    expect(toChordPro(l.text, mergeLyricCells(l.chords, 2, 0))).toBe('[C:4]a b c [F:4]d')
  })

  it('is a no-op for a single cell', () => {
    const l = line('[C:4]a [D:4]b')
    expect(mergeLyricCells(l.chords, 1, 1)).toBe(l.chords)
  })
})

describe('insertBlankLyricCell', () => {
  it('inserts a blank bar with the same chord right after the cell', () => {
    const l = line('[D:4]Hola [G:4]mundo')
    const r = insertBlankLyricCell(l.text, l.chords, 0, 4)
    expect(toChordPro(r.text, r.chords)).toBe('[D:4]Hola [D:4][G:4]mundo')
  })

  it('inserts after the last cell', () => {
    const l = line('[D:4]Hola [G:4]mundo')
    const r = insertBlankLyricCell(l.text, l.chords, 1, 3)
    expect(r.chords.map((c) => [c.chord, c.position, c.beats])).toEqual([
      ['D', 0, 4],
      ['G', 5, 4],
      ['G', 10, 3],
    ])
    expect(r.text).toBe('Hola mundo')
  })
})
