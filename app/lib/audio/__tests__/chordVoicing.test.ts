import { describe, it, expect } from 'vitest'
import { chordIntervals, voiceChord } from '../chordVoicing'

describe('chordIntervals', () => {
  it.each([
    ['', [0, 4, 7]],
    ['m', [0, 3, 7]],
    ['min', [0, 3, 7]],
    ['7', [0, 4, 7, 10]],
    ['m7', [0, 3, 7, 10]],
    ['maj7', [0, 4, 7, 11]],
    ['M7', [0, 4, 7, 11]],
    ['m7b5', [0, 3, 6, 10]],
    ['ø', [0, 3, 6, 10]],
    ['dim', [0, 3, 6]],
    ['°7', [0, 3, 6, 9]],
    ['aug', [0, 4, 8]],
    ['sus4', [0, 5, 7]],
    ['sus2', [0, 2, 7]],
    ['7sus4', [0, 5, 7, 10]],
    ['6', [0, 4, 7, 9]],
    ['m6', [0, 3, 7, 9]],
    ['add9', [0, 4, 7, 14]],
    ['9', [0, 4, 7, 10, 14]],
    ['maj9', [0, 4, 7, 11, 14]],
    ['7#5', [0, 4, 8, 10]],
  ])('%s', (suffix, intervals) => {
    expect(chordIntervals(suffix)).toEqual(intervals)
  })
})

describe('voiceChord', () => {
  it('plays the root in the bass and the chord around middle C', () => {
    expect(voiceChord('C')).toEqual({ bass: 48, chord: [60, 64, 67] })
    expect(voiceChord('Am')).toEqual({ bass: 45, chord: [57, 60, 64] })
    expect(voiceChord('F#m7')).toEqual({ bass: 42, chord: [66, 69, 73, 76] })
    expect(voiceChord('Bb')).toEqual({ bass: 46, chord: [58, 62, 65] })
  })

  it('puts a slash chord bass in the bass', () => {
    expect(voiceChord('C/E')).toEqual({ bass: 40, chord: [60, 64, 67] })
    expect(voiceChord('D/F#')?.bass).toBe(42)
  })

  it('is null for things that are not chords', () => {
    expect(voiceChord('N.C.')).toBeNull()
    expect(voiceChord('hola')).toBeNull()
    expect(voiceChord('')).toBeNull()
  })
})
