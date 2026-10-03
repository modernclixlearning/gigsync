import { describe, it, expect } from 'vitest'
import {
  convertChordsOverLyrics,
  parseChordLine,
  mergeChordsIntoLyric,
} from '../chordsOverLyrics'
import { parseChordPro } from '../parser'
import type { LyricParsedLine } from '../types'

describe('parseChordLine', () => {
  it('returns chords with their columns', () => {
    expect(parseChordLine('G     D/F#  Em')).toEqual([
      { chord: 'G', column: 0 },
      { chord: 'D/F#', column: 6 },
      { chord: 'Em', column: 12 },
    ])
  })

  it('returns null for lyric lines', () => {
    expect(parseChordLine('Ella durmió al calor de las masas')).toBeNull()
  })

  it('returns null for a mixed line', () => {
    expect(parseChordLine('G hola D')).toBeNull()
  })

  it('tolerates bar marks and repeat markers', () => {
    expect(parseChordLine('Am  G  | C  x2')).toEqual([
      { chord: 'Am', column: 0 },
      { chord: 'G', column: 4 },
      { chord: 'C', column: 9 },
    ])
  })

  it('returns null for an empty line', () => {
    expect(parseChordLine('   ')).toBeNull()
  })
})

describe('mergeChordsIntoLyric', () => {
  it('inserts chords at their columns', () => {
    expect(
      mergeChordsIntoLyric(
        [
          { chord: 'C', column: 0 },
          { chord: 'G', column: 6 },
        ],
        'Hello world'
      )
    ).toBe('[C]Hello [G]world')
  })

  it('pads the lyric when a chord sits past its end', () => {
    expect(mergeChordsIntoLyric([{ chord: 'D', column: 8 }], 'Hola')).toBe('Hola    [D]')
  })

  it('keeps trailing chords one space apart', () => {
    expect(
      mergeChordsIntoLyric(
        [
          { chord: 'D', column: 6 },
          { chord: 'A', column: 10 },
        ],
        'Hola'
      )
    ).toBe('Hola  [D] [A]')
  })
})

describe('convertChordsOverLyrics', () => {
  it('merges a chord line into the lyric line below it at the right columns', () => {
    const input = [
      'G         D/F#     Em',
      'Ella durmió al calor de las masas',
    ].join('\n')

    const result = convertChordsOverLyrics(input)

    expect(result.chordPro).toBe('[G]Ella durmi[D/F#]ó al calo[Em]r de las masas')
    expect(result.mergedLines).toBe(1)
    expect(result.chordOnlyLines).toBe(0)
  })

  it('places chords on word boundaries when aligned that way', () => {
    const input = ['C      G', 'Hello  world'].join('\n')
    expect(convertChordsOverLyrics(input).chordPro).toBe('[C]Hello  [G]world')
  })

  it('handles slash chords (bass notes)', () => {
    const input = ['G/B    C', 'Paso a paso'].join('\n')
    expect(convertChordsOverLyrics(input).chordPro).toBe('[G/B]Paso a [C]paso')
  })

  it('keeps section headers like [Verse] and [Coro]', () => {
    const input = [
      '[Verse]',
      'Am      F',
      'Primera línea',
      '',
      '[Coro]',
      'C          G',
      'Estribillo aquí',
    ].join('\n')

    expect(convertChordsOverLyrics(input).chordPro).toBe(
      [
        '[Verse]',
        '[Am]Primera [F]línea',
        '',
        '[Coro]',
        '[C]Estribillo [G]aquí',
      ].join('\n')
    )
  })

  it('turns a chord line with no lyric below into a bar line', () => {
    const input = ['[Intro]', 'G   D   Em   C', '', 'G        D', 'Letra'].join('\n')
    const result = convertChordsOverLyrics(input)

    expect(result.chordPro).toBe(
      ['[Intro]', 'G | D | Em | C |', '', '[G]Letra    [D]'].join('\n')
    )
    expect(result.chordOnlyLines).toBe(1)
    expect(result.mergedLines).toBe(1)
  })

  it('treats two chord lines in a row: first becomes a bar line', () => {
    const input = ['Am  G', 'C   F', 'Una letra'].join('\n')
    expect(convertChordsOverLyrics(input).chordPro).toBe(
      ['Am | G |', '[C]Una [F]letra'].join('\n')
    )
  })

  it('keeps a single chord over a lyric merged (not as a bar line)', () => {
    const input = ['    E', 'Ya no'].join('\n')
    expect(convertChordsOverLyrics(input).chordPro).toBe('Ya n[E]o')
  })

  it('keeps existing GigSync bar lines untouched', () => {
    const input = 'Am | G | C | F | x2'
    expect(convertChordsOverLyrics(input).chordPro).toBe('Am | G | C | F | x2')
  })

  it('leaves plain lyrics untouched', () => {
    const input = 'Solo letra\nsin acordes'
    const result = convertChordsOverLyrics(input)
    expect(result.chordPro).toBe(input)
    expect(result.mergedLines).toBe(0)
    expect(result.chordOnlyLines).toBe(0)
  })

  it('normalises CRLF, NBSP and tabs', () => {
    const input = 'C    G\r\nHola mundo\r\n'
    expect(convertChordsOverLyrics(input).chordPro).toBe('[C]Hola [G]mundo')

    const tabbed = 'C\tG\nHola mundo'
    expect(convertChordsOverLyrics(tabbed).chordPro).toBe('[C]Hola[G] mundo')
  })

  it('trims surrounding blank lines and collapses long blank runs', () => {
    const input = '\n\nC\nHola\n\n\n\nD\nChau\n\n'
    expect(convertChordsOverLyrics(input).chordPro).toBe('[C]Hola\n\n[D]Chau')
  })

  it('produces text the ChordPro parser reads with chords at the right positions', () => {
    const input = ['[Verse]', 'G         D/F#', 'Ella durmió al calor'].join('\n')
    const parsed = parseChordPro(convertChordsOverLyrics(input).chordPro)

    const section = parsed.lines.find((l) => l.type === 'section')
    expect(section).toBeDefined()

    const lyric = parsed.lines.find((l) => l.type === 'lyric') as LyricParsedLine
    expect(lyric.text).toBe('Ella durmió al calor')
    expect(lyric.chords.map((c) => [c.chord, c.position])).toEqual([
      ['G', 0],
      ['D/F#', 10],
    ])
  })
})
