import { describe, it, expect } from 'vitest'
import {
  parseChordPro,
  parseChordProLegacy,
  parseLine,
  stripChords,
  extractChords,
} from '../parser'
import { parseSectionHeader, parseChordBars, parseInstrumentalSection } from '../instrumental'
import { transposeChord, parseChordString, getInterval } from '../transpose'

describe('ChordPro Parser', () => {
  describe('parseLine', () => {
    it('should parse a plain text line as lyric', () => {
      const result = parseLine('Just some lyrics')
      expect(result.type).toBe('lyric')
      if (result.type === 'lyric') {
        expect(result.text).toBe('Just some lyrics')
        expect(result.chords).toEqual([])
      }
    })

    it('should parse a line with chords', () => {
      const result = parseLine('[Am]Hello [G]World')
      expect(result.type).toBe('lyric')
      if (result.type === 'lyric') {
        expect(result.text).toBe('Hello World')
        expect(result.chords).toEqual([
          { chord: 'Am', position: 0 },
          { chord: 'G', position: 6 },
        ])
      }
    })

    it('should parse standard section markers', () => {
      expect(parseLine('[Verse]').type).toBe('section')
      expect(parseLine('[Chorus]').type).toBe('section')
      expect(parseLine('[Bridge]').type).toBe('section')
      expect(parseLine('[Intro]').type).toBe('section')
      expect(parseLine('[Outro]').type).toBe('section')
      expect(parseLine('[Pre-Chorus]').type).toBe('section')
      expect(parseLine('[Solo]').type).toBe('section')
    })

    it('should parse numbered sections', () => {
      const result = parseLine('[Verse 2]')
      expect(result.type).toBe('section')
      if (result.type === 'section') {
        expect(result.name).toBe('Verse 2')
      }
    })

    it('should parse ChordPro directive comments', () => {
      const result = parseLine('{comment: This is a note}')
      expect(result.type).toBe('directive')
      if (result.type === 'directive') {
        expect(result.directive).toBe('comment')
        expect(result.value).toBe('This is a note')
      }
    })

    it('should parse title directive', () => {
      const result = parseLine('{title: My Song}')
      expect(result.type).toBe('directive')
      if (result.type === 'directive') {
        expect(result.directive).toBe('title')
        expect(result.value).toBe('My Song')
      }
    })

    it('should parse capo directive', () => {
      const result = parseLine('{capo: 2}')
      expect(result.type).toBe('directive')
      if (result.type === 'directive') {
        expect(result.directive).toBe('capo')
        expect(result.value).toBe('2')
      }
    })

    it('should parse empty lines', () => {
      const result = parseLine('')
      expect(result.type).toBe('empty')
    })
  })

  describe('parseChordPro', () => {
    it('should parse a complete song', () => {
      const input = `{title: Test Song}
{artist: Test Artist}

[Verse 1]
[Am]This is the [G]first line
[C]Second [F]line here

[Chorus]
[G]Sing a[C]long`

      const result = parseChordPro(input)
      
      expect(result.directives.title).toBe('Test Song')
      expect(result.directives.artist).toBe('Test Artist')
      expect(result.lines.length).toBeGreaterThan(0)
      
      // Check sections
      const sections = result.lines.filter(l => l.type === 'section')
      expect(sections.length).toBe(2)
    })

    it('should extract metadata from directives', () => {
      const input = `{title: Amazing Grace}
{artist: John Newton}
{key: G}
{tempo: 80}
{capo: 2}`

      const result = parseChordPro(input)
      
      expect(result.directives.title).toBe('Amazing Grace')
      expect(result.directives.artist).toBe('John Newton')
      expect(result.directives.key).toBe('G')
      expect(result.directives.tempo).toBe(80)
      expect(result.directives.capo).toBe(2)
    })
  })

  describe('parseChordProLegacy', () => {
    it('should return ChordProSong object', () => {
      const input = `{title: My Song}
{artist: Someone}
[Verse]
[Am]Hello [G]World`

      const result = parseChordProLegacy(input)
      
      expect(result.title).toBe('My Song')
      expect(result.artist).toBe('Someone')
      expect(result.lines.length).toBe(1)
      expect(result.lines[0].text).toBe('Hello World')
      expect(result.lines[0].chords).toHaveLength(2)
    })
  })

  describe('stripChords', () => {
    it('should remove all chord markers from text', () => {
      expect(stripChords('[Am]Hello [G]World')).toBe('Hello World')
      expect(stripChords('[C]No [F]chords [G]left')).toBe('No chords left')
      expect(stripChords('Plain text')).toBe('Plain text')
    })

    it('should handle complex chord names', () => {
      expect(stripChords('[Am7]Test [Cmaj7]Line')).toBe('Test Line')
      expect(stripChords('[F#m]Sharp [Bb]Flat')).toBe('Sharp Flat')
    })
  })

  describe('extractChords', () => {
    it('should extract all chords from text', () => {
      const chords = extractChords('[Am]Hello [G]World [C]!')
      expect(chords).toEqual(['Am', 'G', 'C'])
    })

    it('should return empty array if no chords', () => {
      expect(extractChords('No chords here')).toEqual([])
    })
  })
})

describe('Instrumental Section Parser', () => {
  describe('parseSectionHeader', () => {
    it('should parse section with bar count', () => {
      const result = parseSectionHeader('[Intro | 4 bars]')
      expect(result).not.toBeNull()
      expect(result?.name).toBe('Intro')
      expect(result?.bars).toBe(4)
    })

    it('should parse section with bar count (singular)', () => {
      const result = parseSectionHeader('[Solo | 1 bar]')
      expect(result).not.toBeNull()
      expect(result?.name).toBe('Solo')
      expect(result?.bars).toBe(1)
    })

    it('should handle different section types', () => {
      const intro = parseSectionHeader('[Intro | 8 bars]')
      expect(intro?.name).toBe('Intro')
      expect(intro?.bars).toBe(8)
      
      const outro = parseSectionHeader('[Outro | 4 bars]')
      expect(outro?.name).toBe('Outro')
      expect(outro?.bars).toBe(4)
      
      const solo = parseSectionHeader('[Solo | 16 bars]')
      expect(solo?.name).toBe('Solo')
      expect(solo?.bars).toBe(16)
    })

    it('should parse simple sections without bars', () => {
      const verse = parseSectionHeader('[Verse]')
      expect(verse?.name).toBe('Verse')
      expect(verse?.bars).toBeUndefined()
      
      const chorus = parseSectionHeader('[Chorus]')
      expect(chorus?.name).toBe('Chorus')
      expect(chorus?.bars).toBeUndefined()
    })
  })

  describe('parseChordBars', () => {
    it('should parse simple chord progression', () => {
      const result = parseChordBars('Am | G | C | F |')
      expect(result).not.toBeNull()
      expect(result?.bars).toHaveLength(4)
      expect(result?.bars[0].chord).toBe('Am')
      expect(result?.bars[1].chord).toBe('G')
      expect(result?.bars[2].chord).toBe('C')
      expect(result?.bars[3].chord).toBe('F')
    })

    it('should handle bars without trailing separator', () => {
      const result = parseChordBars('Am | G | C | F')
      expect(result?.bars).toHaveLength(4)
    })

    it('should handle repeat markers', () => {
      const result = parseChordBars('Am | G | x4')
      expect(result?.bars).toHaveLength(2)
      expect(result?.repeatCount).toBe(4)
    })

    it('should return null for non-chord lines', () => {
      const result = parseChordBars('This is just lyrics')
      expect(result).toBeNull()
    })
  })

  describe('parseInstrumentalSection', () => {
    it('should parse complete instrumental section', () => {
      const result = parseInstrumentalSection('[Intro | 4 bars]', ['Am | G | C | F |'])
      
      expect(result).not.toBeNull()
      expect(result?.name).toBe('Intro')
      expect(result?.bars).toBe(4)
      expect(result?.chordBars).toHaveLength(4)
    })

    it('should parse section with multiple chord lines', () => {
      const result = parseInstrumentalSection(
        '[Solo | 8 bars]',
        ['Am | G | C | F |', 'Dm | Am | E | Am |']
      )
      
      expect(result?.chordBars).toHaveLength(8)
    })

    it('should return null for non-instrumental sections', () => {
      const result = parseInstrumentalSection('plaintext', ['[Am]Hello World'])
      expect(result).toBeNull()
    })
  })
})

describe('Transpose Utilities', () => {
  describe('parseChordString', () => {
    it('should extract root from simple chords', () => {
      const am = parseChordString('Am')
      expect(am?.root).toBe('A')
      expect(am?.accidental).toBe('')
      expect(am?.suffix).toBe('m')
      
      const c = parseChordString('C')
      expect(c?.root).toBe('C')
      
      const g7 = parseChordString('G7')
      expect(g7?.root).toBe('G')
      expect(g7?.suffix).toBe('7')
    })

    it('should handle sharps and flats', () => {
      const fsharp = parseChordString('F#m')
      expect(fsharp?.root).toBe('F')
      expect(fsharp?.accidental).toBe('#')
      
      const bb = parseChordString('Bb')
      expect(bb?.root).toBe('B')
      expect(bb?.accidental).toBe('b')
    })
  })

  describe('getInterval', () => {
    it('should calculate semitones between keys', () => {
      expect(getInterval('C', 'D')).toBe(2)
      expect(getInterval('C', 'G')).toBe(7)
      expect(getInterval('G', 'C')).toBe(5)
      expect(getInterval('A', 'A')).toBe(0)
    })
  })

  describe('transposeChord', () => {
    it('should transpose up by semitones', () => {
      expect(transposeChord('C', 2)).toBe('D')
      expect(transposeChord('Am', 2)).toBe('Bm')
      expect(transposeChord('G', 5)).toBe('C')
    })

    it('should transpose down (negative semitones)', () => {
      expect(transposeChord('D', -2)).toBe('C')
      expect(transposeChord('C', -1)).toBe('B')
    })

    it('should handle wrap-around', () => {
      expect(transposeChord('B', 1)).toBe('C')
      expect(transposeChord('C', -1)).toBe('B')
    })

    it('should preserve chord quality', () => {
      expect(transposeChord('Am7', 2)).toBe('Bm7')
      expect(transposeChord('Cmaj7', 2)).toBe('Dmaj7')
      expect(transposeChord('Gdim', 5)).toBe('Cdim')
    })

    it('should handle sharps and flats', () => {
      expect(transposeChord('F#m', 2)).toBe('G#m')
      expect(transposeChord('Bb', 2)).toBe('C')
    })

    it('should return original chord for 0 semitones', () => {
      expect(transposeChord('Am', 0)).toBe('Am')
      expect(transposeChord('G7', 0)).toBe('G7')
    })
  })
})

import { parseChordPositions } from '../parser'
import { serializeLyricLine } from '../serializer'
import type { LyricParsedLine } from '../types'

describe('ChordPosition beats syntax', () => {
  describe('parseChordPositions', () => {
    it('parses [Am:2] as chord Am with beats 2', () => {
      const { chords, text } = parseChordPositions('[Am:2]texto')
      expect(chords).toHaveLength(1)
      expect(chords[0].chord).toBe('Am')
      expect(chords[0].beats).toBe(2)
      expect(text).toBe('texto')
    })

    it('parses [Am:0.25] as chord Am with beats 0.25', () => {
      const { chords } = parseChordPositions('[Am:0.25]')
      expect(chords[0].chord).toBe('Am')
      expect(chords[0].beats).toBe(0.25)
    })

    it('parses plain [Am] without beats field', () => {
      const { chords } = parseChordPositions('[Am]texto')
      expect(chords[0].chord).toBe('Am')
      expect(chords[0].beats).toBeUndefined()
    })

    it('parses mixed: [Am:2] with beats and [G] without', () => {
      const { chords } = parseChordPositions('[Am:2]hello [G]world')
      expect(chords).toHaveLength(2)
      expect(chords[0].beats).toBe(2)
      expect(chords[1].beats).toBeUndefined()
    })

    it('ignores invalid beats (zero, negative, NaN)', () => {
      expect(parseChordPositions('[Am:0]').chords[0].beats).toBeUndefined()
      expect(parseChordPositions('[Am:-1]').chords[0].beats).toBeUndefined()
      expect(parseChordPositions('[Am:abc]').chords[0].beats).toBeUndefined()
    })
  })

  describe('serializeLyricLine round-trip', () => {
    it('serializes beats back as [chord:N]', () => {
      const line: LyricParsedLine = {
        type: 'lyric', raw: '',
        text: 'texto',
        chords: [{ chord: 'Am', position: 0, beats: 2 }]
      }
      expect(serializeLyricLine(line)).toBe('[Am:2]texto')
    })

    it('serializes decimal beats as [chord:N.N]', () => {
      const line: LyricParsedLine = {
        type: 'lyric', raw: '',
        text: '',
        chords: [{ chord: 'G', position: 0, beats: 0.25 }]
      }
      expect(serializeLyricLine(line)).toBe('[G:0.25]')
    })

    it('omits beats suffix when beats is undefined', () => {
      const line: LyricParsedLine = {
        type: 'lyric', raw: '',
        text: 'texto',
        chords: [{ chord: 'Am', position: 0 }]
      }
      expect(serializeLyricLine(line)).toBe('[Am]texto')
    })

    it('round-trips [Am:2]texto through parse→serialize', () => {
      const input = '[Am:2]texto lírico'
      const { text, chords } = parseChordPositions(input)
      const line: LyricParsedLine = { type: 'lyric', raw: input, text, chords }
      expect(serializeLyricLine(line)).toBe(input)
    })

    it('round-trips plain [Am]texto through parse→serialize', () => {
      const input = '[Am]texto'
      const { text, chords } = parseChordPositions(input)
      const line: LyricParsedLine = { type: 'lyric', raw: input, text, chords }
      expect(serializeLyricLine(line)).toBe(input)
    })
  })
})
