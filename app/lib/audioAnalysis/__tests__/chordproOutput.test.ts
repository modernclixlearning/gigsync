import { describe, it, expect } from 'vitest'
import {
  appendSection,
  beatsPerBarFromTimeSignature,
  buildDetectedSection,
  DETECTED_SECTION_NAME,
  parseBarText,
  progressionToBarLines,
} from '../chordproOutput'
import { parseChordPro } from '~/lib/chordpro'
import type { ChordProgression, DetectedChordCell } from '../types'

const cell = (chord: string | null, beats = 4): DetectedChordCell => ({
  chord,
  beats,
  startTime: 0,
  endTime: 0,
  confidence: chord ? 0.9 : 0,
})

function prog(bars: DetectedChordCell[][], beatsPerBar = 4): ChordProgression {
  return {
    beatsPerBar,
    downbeatOffset: 0,
    bars: bars.map((cells, index) => ({ index, startTime: 0, endTime: 0, cells })),
  }
}

describe('progressionToBarLines', () => {
  it('writes 4 bars per line, half bars with beat counts, unclear cells repeat the previous chord', () => {
    const lines = progressionToBarLines(
      prog([[cell('C')], [cell('G')], [cell(null)], [cell('F', 2), cell('G', 2)], [cell('Am')]]),
    )
    expect(lines).toEqual(['C | G | G | F 2 | G 2 |', 'Am |'])
  })

  it('returns no lines for an empty progression', () => {
    expect(progressionToBarLines(prog([]))).toEqual([])
  })
})

describe('parseBarText', () => {
  it('accepts valid chord-bar lines and counts bars by beats', () => {
    const r = parseBarText('C | G | Am | F |\n\nF 2 | G 2 | C |', 4)
    expect(r.invalidLines).toEqual([])
    expect(r.lines).toHaveLength(2)
    expect(r.barCount).toBe(6)
  })

  it('flags lines that are not chord bars', () => {
    const r = parseBarText('C | G |\nhello world\nC | Xyz |', 4)
    expect(r.invalidLines).toEqual([2, 3])
    expect(r.lines).toEqual(['C | G |'])
  })
})

describe('buildDetectedSection + appendSection', () => {
  it('produces a section the existing ChordPro parser reads as an instrumental block', () => {
    const original = '{title: Test}\n[Verse]\n[C]Hello [G]world'
    const section = buildDetectedSection(['C | G | Am | F 2 | G 2 |'], 4)
    const lyrics = appendSection(original, section)
    expect(lyrics.startsWith(original)).toBe(true)

    const parsed = parseChordPro(lyrics)
    const instrumental = parsed.lines.find(l => l.type === 'instrumental')
    expect(instrumental).toBeDefined()
    if (instrumental?.type !== 'instrumental') throw new Error('expected instrumental')
    expect(instrumental.section.name).toBe(DETECTED_SECTION_NAME)
    expect(instrumental.section.bars).toBe(4)
    expect(instrumental.section.chordBars.map(b => b.chord)).toEqual(['C', 'G', 'Am', 'F', 'G'])
    expect(instrumental.section.chordBars[3].beats).toBe(2)
  })

  it('works on empty lyrics', () => {
    expect(appendSection('', 'X')).toBe('X\n')
  })
})

describe('beatsPerBarFromTimeSignature', () => {
  it.each([
    ['4/4', 4],
    ['3/4', 3],
    ['6/8', 6],
    ['', 4],
    [undefined, 4],
  ])('%s → %i', (sig, expected) => {
    expect(beatsPerBarFromTimeSignature(sig as string | undefined)).toBe(expected)
  })
})
