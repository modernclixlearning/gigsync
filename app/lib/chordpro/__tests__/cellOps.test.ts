import { describe, it, expect } from 'vitest'
import { moveLyricCell, insertBlankLyricCell } from '../cellOps'
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
