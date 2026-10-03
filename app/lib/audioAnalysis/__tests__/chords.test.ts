import { describe, it, expect } from 'vitest'
import { chromaForWindow, detectChordProgression, matchChord } from '../chords'
import { deriveBpmAndChords } from '../derive'
import { chordTones, syntheticSong } from './synthetic'
import type { ChordProgression } from '../types'

function chromaOf(label: string, extra: Record<number, number> = {}): number[] {
  const c = new Array(12).fill(0)
  for (const pc of chordTones(label)) c[pc] = 1
  for (const [pc, v] of Object.entries(extra)) c[Number(pc)] += v
  return c
}

function labels(progression: ChordProgression): string[] {
  return progression.bars.map(b => b.cells.map(c => c.chord ?? 'N').join('/'))
}

describe('matchChord', () => {
  it.each(['C', 'Am', 'G7', 'Dm7', 'F#m', 'Bb', 'Eb7', 'E'])('labels a clean %s chroma', label => {
    expect(matchChord(chromaOf(label))?.label).toBe(label)
  })

  it('prefers the triad when the seventh is absent', () => {
    expect(matchChord(chromaOf('G'))?.label).toBe('G')
  })

  it('tolerates a passing non-chord tone', () => {
    // C major with a weak D (passing tone)
    expect(matchChord(chromaOf('C', { 2: 0.3 }))?.label).toBe('C')
  })

  it('returns null for an empty chroma', () => {
    expect(matchChord(new Array(12).fill(0))).toBeNull()
  })
})

describe('chromaForWindow', () => {
  it('weights notes by overlap and amplitude', () => {
    const chroma = chromaForWindow(
      [
        { startTimeSeconds: 0, durationSeconds: 1, pitchMidi: 60, amplitude: 1 },
        { startTimeSeconds: 0.5, durationSeconds: 1, pitchMidi: 64, amplitude: 0.5 },
      ],
      0,
      1,
    )
    expect(chroma[0]).toBeCloseTo(1)
    expect(chroma[4]).toBeCloseTo(0.25)
  })
})

describe('detectChordProgression', () => {
  const beatsFor = (bpm: number, count: number, offset = 0) =>
    Array.from({ length: count }, (_, i) => offset + (i * 60) / bpm)

  it('labels one chord per bar and finds the downbeat after a pickup', () => {
    const bars = ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C']
    const { notes } = syntheticSong({ bpm: 120, bars, leadInBeats: 2 })
    // beat grid starts at t=0, so the music starts on grid beat 2
    const progression = detectChordProgression(notes, beatsFor(120, 2 + bars.length * 4 + 1), 4)
    expect(progression.downbeatOffset).toBe(2)
    expect(labels(progression)).toEqual(bars)
  })

  it('splits a bar when the chord changes at the half', () => {
    const bars: (string | string[])[] = ['Am', ['F', 'G'], 'C', 'E7']
    const { notes } = syntheticSong({ bpm: 100, bars })
    const progression = detectChordProgression(notes, beatsFor(100, bars.length * 4 + 1), 4)
    expect(labels(progression)).toEqual(['Am', 'F/G', 'C', 'E7'])
    expect(progression.bars[1].cells.map(c => c.beats)).toEqual([2, 2])
  })

  it('handles 3/4', () => {
    const bars = ['D', 'A7', 'Bm', 'G']
    const { notes } = syntheticSong({ bpm: 90, beatsPerBar: 3, bars })
    const progression = detectChordProgression(notes, beatsFor(90, bars.length * 3 + 1), 3)
    expect(labels(progression)).toEqual(bars)
  })

  it('trims silent bars at the edges and marks inner gaps as unclear', () => {
    const a = syntheticSong({ bpm: 120, bars: ['C', 'G'] })
    const b = syntheticSong({ bpm: 120, bars: ['Am', 'F'], leadInBeats: 12 })
    // a: bars 0-1, silence bar 2, b: bars 3-4, then trailing silence
    const progression = detectChordProgression([...a.notes, ...b.notes], beatsFor(120, 4 * 7 + 1), 4)
    expect(labels(progression)).toEqual(['C', 'G', 'N', 'Am', 'F'])
  })

  it('returns no bars without a beat grid', () => {
    expect(detectChordProgression([], [], 4).bars).toEqual([])
  })
})

describe('deriveBpmAndChords (end to end on synthetic notes)', () => {
  it('recovers BPM and chords of a strummed progression', () => {
    const bars = ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'C', 'Em', 'D', 'G', 'G']
    const { notes, durationSeconds } = syntheticSong({ bpm: 96, bars, leadInBeats: 1 })
    const result = deriveBpmAndChords({ notes, durationSeconds, beatsPerBar: 4 })
    expect(result.bpm).not.toBeNull()
    expect(Math.abs(result.bpm! - 96)).toBeLessThanOrEqual(1)
    expect(labels(result.progression)).toEqual(bars)
    expect(result.noteCount).toBe(notes.length)
  })
})
