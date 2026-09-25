/**
 * Tests for the chord editor beat grid
 */

import { describe, it, expect } from 'vitest'
import { effectiveLyricChordBeats, layoutBeatGrid } from '../beatGrid'
import { calculateElementDuration } from '../calculator'
import type { LyricParsedLine } from '~/lib/chordpro'

const opts44 = { beatsPerBar: 4, barsPerRow: 2, gridResolution: 0.25 }

describe('effectiveLyricChordBeats', () => {
  it('uses explicit beats when every chord has them', () => {
    expect(effectiveLyricChordBeats([{ beats: 2 }, { beats: 6 }], 4)).toEqual([2, 6])
  })

  it('splits the default bars evenly otherwise, matching playback duration', () => {
    const line: LyricParsedLine = {
      type: 'lyric',
      text: 'abc',
      raw: '',
      chords: [
        { chord: 'C', position: 0 },
        { chord: 'G', position: 1, beats: 4 },
        { chord: 'Am', position: 2 },
        { chord: 'F', position: 3 },
      ],
    }
    const beats = effectiveLyricChordBeats(line.chords, 4)
    expect(beats).toEqual([2, 2, 2, 2])
    const duration = calculateElementDuration(
      line,
      { defaultBarsPerLine: 2, defaultBeatsPerChord: 4, intelligentEstimation: false },
      '4/4'
    )
    expect(beats.reduce((s, b) => s + b, 0)).toBe(duration)
  })

  it('respects the time signature', () => {
    expect(effectiveLyricChordBeats([{}, {}], 3)).toEqual([3, 3])
  })
})

describe('layoutBeatGrid', () => {
  it('places chords by their start beat on a fixed row width', () => {
    const layout = layoutBeatGrid([4, 2, 2], opts44)
    expect(layout.unitsPerRow).toBe(32)
    expect(layout.rows).toBe(1)
    expect(layout.segments.map((s) => [s.start, s.span])).toEqual([
      [0, 16],
      [16, 8],
      [24, 8],
    ])
  })

  it('never stretches a short chord to fill the row', () => {
    const layout = layoutBeatGrid([2], opts44)
    expect(layout.segments[0]).toMatchObject({ start: 0, span: 8, isHead: true, isTail: true })
  })

  it('wraps to the next row on the bar grid', () => {
    const layout = layoutBeatGrid([4, 4, 4], opts44)
    expect(layout.rows).toBe(2)
    expect(layout.segments[2]).toMatchObject({ row: 1, start: 0, span: 16 })
  })

  it('splits a chord that crosses the row boundary', () => {
    const layout = layoutBeatGrid([6, 4], opts44)
    const second = layout.segments.filter((s) => s.index === 1)
    expect(second).toEqual([
      { index: 1, row: 0, start: 24, span: 8, isHead: true, isTail: false },
      { index: 1, row: 1, start: 0, span: 8, isHead: false, isTail: true },
    ])
  })

  it('uses the time signature for the row width', () => {
    expect(layoutBeatGrid([3], { beatsPerBar: 3, barsPerRow: 2, gridResolution: 1 }).unitsPerRow).toBe(6)
  })
})
