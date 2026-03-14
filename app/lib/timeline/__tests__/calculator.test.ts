/**
 * Tests for timeline calculator
 */

import { describe, it, expect } from 'vitest'
import {
  calculateElementDuration,
  createSongTimeline
} from '../calculator'
import type { 
  LyricParsedLine,
  InstrumentalLine,
  ChordsOnlyLine
} from '~/lib/chordpro'

describe('calculateElementDuration', () => {
  it('should calculate duration for instrumental section', () => {
    const instrumental: InstrumentalLine = {
      type: 'instrumental',
      raw: '[Intro | 4 bars]',
      section: {
        name: 'Intro',
        type: 'intro',
        bars: 4,
        chordBars: []
      }
    }

    const duration = calculateElementDuration(instrumental, {
      defaultBarsPerLine: 2,
      defaultBeatsPerChord: 4,
      intelligentEstimation: false
    }, '4/4')

    // 4 bars * 4 beats = 16 beats
    expect(duration).toBe(16)
  })

  it('should calculate duration for chords-only line', () => {
    const chordsOnly: ChordsOnlyLine = {
      type: 'chords-only',
      raw: 'C G Am F',
      chordBars: [
        { chord: 'C', beats: 4 },
        { chord: 'G', beats: 4 },
        { chord: 'Am', beats: 4 },
        { chord: 'F', beats: 4 }
      ]
    }

    const duration = calculateElementDuration(chordsOnly, {
      defaultBarsPerLine: 2,
      defaultBeatsPerChord: 4,
      intelligentEstimation: false
    }, '4/4')

    // 4 chord bars * 4 beats = 16 beats
    expect(duration).toBe(16)
  })

  it('should use default bars for simple lyric line', () => {
    const lyric: LyricParsedLine = {
      type: 'lyric',
      raw: 'This is a simple line',
      text: 'This is a simple line',
      chords: []
    }

    const duration = calculateElementDuration(lyric, {
      defaultBarsPerLine: 2,
      defaultBeatsPerChord: 4,
      intelligentEstimation: false
    }, '4/4')

    // Default 2 bars * 4 beats = 8 beats
    expect(duration).toBe(8)
  })

  it('should use sum of explicit beats for lyric line when all chords have beats', () => {
    const lyric: LyricParsedLine = {
      type: 'lyric',
      raw: '[Am:2]Hello [G:3]world',
      text: 'Hello world',
      chords: [
        { chord: 'Am', position: 0, beats: 2 },
        { chord: 'G', position: 6, beats: 3 },
      ]
    }

    const duration = calculateElementDuration(lyric, {
      defaultBarsPerLine: 2,
      defaultBeatsPerChord: 4,
      intelligentEstimation: false
    }, '4/4')

    // 2 + 3 = 5 beats (explicit sum)
    expect(duration).toBe(5)
  })

  it('should fall back to default bars when only some chords have beats', () => {
    const lyric: LyricParsedLine = {
      type: 'lyric',
      raw: '[Am:2]Hello [G]world',
      text: 'Hello world',
      chords: [
        { chord: 'Am', position: 0, beats: 2 },
        { chord: 'G', position: 6 },  // no beats
      ]
    }

    const duration = calculateElementDuration(lyric, {
      defaultBarsPerLine: 2,
      defaultBeatsPerChord: 4,
      intelligentEstimation: false
    }, '4/4')

    // Mixed: fall back to default 2 bars * 4 beats = 8
    expect(duration).toBe(8)
  })

  it('should fall back to default bars for lyric line with chords but no explicit beats', () => {
    const lyric: LyricParsedLine = {
      type: 'lyric',
      raw: '[Am]Hello [G]world',
      text: 'Hello world',
      chords: [
        { chord: 'Am', position: 0 },
        { chord: 'G', position: 6 },
      ]
    }

    const duration = calculateElementDuration(lyric, {
      defaultBarsPerLine: 2,
      defaultBeatsPerChord: 4,
      intelligentEstimation: false
    }, '4/4')

    // No explicit beats: default 2 bars * 4 beats = 8
    expect(duration).toBe(8)
  })
})

describe('createSongTimeline', () => {
  it('should create a basic timeline', () => {
    const lyrics = `[Verse]
[Intro | 4 bars]
Hello world
Goodbye world`

    const timeline = createSongTimeline(lyrics, 120, '4/4', {
      defaultBarsPerLine: 2,
      defaultBeatsPerChord: 4,
      intelligentEstimation: false
    })

    expect(timeline).toBeDefined()
    expect(timeline.bpm).toBe(120)
    expect(timeline.beatsPerBar).toBe(4)
    expect(timeline.elements.length).toBeGreaterThan(0)
  })

  it('should calculate cumulative beat positions', () => {
    const lyrics = `[Intro | 2 bars]
First line
Second line`

    const timeline = createSongTimeline(lyrics, 120, '4/4', {
      defaultBarsPerLine: 2,
      defaultBeatsPerChord: 4,
      intelligentEstimation: false
    })

    // Check that startBeat increments correctly
    for (let i = 1; i < timeline.elements.length; i++) {
      const prev = timeline.elements[i - 1]
      const curr = timeline.elements[i]
      expect(curr.startBeat).toBe(prev.endBeat)
    }
  })

  it('should skip directive lines', () => {
    const lyrics = `{title: Test Song}
{artist: Test Artist}
First line`

    const timeline = createSongTimeline(lyrics, 120, '4/4', {
      defaultBarsPerLine: 2,
      defaultBeatsPerChord: 4,
      intelligentEstimation: false
    })

    // Should not include directive elements
    const hasDirective = timeline.elements.some(el => (el.type as string) === 'directive')
    expect(hasDirective).toBe(false)
  })

  it('should calculate total duration correctly', () => {
    const lyrics = `[Intro | 4 bars]`

    const timeline = createSongTimeline(lyrics, 120, '4/4', {
      defaultBarsPerLine: 2,
      defaultBeatsPerChord: 4,
      intelligentEstimation: false
    })

    // 4 bars = 16 beats at 120 BPM = 8 seconds
    expect(timeline.totalBeats).toBe(16)
    expect(timeline.totalBars).toBe(4)
    expect(timeline.totalDurationSeconds).toBe(8)
  })

  it('should calculate correct total duration with lyrics having explicit beats', () => {
    const lyrics = `[Verse]\n[Am]Hello [G]world`

    const timeline = createSongTimeline(lyrics, 120, '4/4', {
      defaultBarsPerLine: 2,
      defaultBeatsPerChord: 4,
      intelligentEstimation: false
    })

    // Without explicit beats, lyric line uses defaultBarsPerLine = 2 bars = 8 beats
    const lyricElement = timeline.elements.find(e => e.type === 'lyric')
    expect(lyricElement?.durationBeats).toBe(8)
  })
})
