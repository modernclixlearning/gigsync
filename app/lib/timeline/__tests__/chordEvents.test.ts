import { describe, it, expect } from 'vitest'
import { createSongTimeline } from '../calculator'
import { chordEventAt, chordEvents } from '../chordEvents'

const options = { defaultBarsPerLine: 2, defaultBeatsPerChord: 4, intelligentEstimation: false }

describe('chordEvents', () => {
  it('times every chord like the player: bars, lyric chords and repeats', () => {
    const lyrics = [
      '[Intro | 2 bars]',
      'C | G 2 | D 2 |',
      '',
      '[Verse]',
      '[Am]Hola que [F]tal',
      '[C:2]Uno [G:6]dos',
      '[Coda | 2 bars]',
      'Em | Am | x2',
      '[N.C.]Silencio [D]ya',
    ].join('\n')
    const timeline = createSongTimeline(lyrics, 120, '4/4', options)
    expect(chordEvents(timeline)).toEqual([
      { chord: 'C', startBeat: 0, durationBeats: 4 },
      { chord: 'G', startBeat: 4, durationBeats: 2 },
      { chord: 'D', startBeat: 6, durationBeats: 2 },
      // Lyric line without beats: 2 bars split evenly.
      { chord: 'Am', startBeat: 8, durationBeats: 4 },
      { chord: 'F', startBeat: 12, durationBeats: 4 },
      // Explicit beats.
      { chord: 'C', startBeat: 16, durationBeats: 2 },
      { chord: 'G', startBeat: 18, durationBeats: 6 },
      // ×2 repeat.
      { chord: 'Em', startBeat: 24, durationBeats: 4 },
      { chord: 'Am', startBeat: 28, durationBeats: 4 },
      { chord: 'Em', startBeat: 32, durationBeats: 4 },
      { chord: 'Am', startBeat: 36, durationBeats: 4 },
      // [N.C.] isn't a chord for the sheet either: the line is D for its 2 bars.
      { chord: 'D', startBeat: 40, durationBeats: 8 },
    ])
  })

  it('is empty without a timeline', () => {
    expect(chordEvents(null)).toEqual([])
  })
})

describe('chordEventAt', () => {
  const events = [
    { chord: 'C', startBeat: 0, durationBeats: 4 },
    { chord: 'G', startBeat: 4, durationBeats: 2 },
  ]

  it('finds the chord sounding at a beat (start inclusive)', () => {
    expect(chordEventAt(events, 0)?.chord).toBe('C')
    expect(chordEventAt(events, 3.9)?.chord).toBe('C')
    expect(chordEventAt(events, 4)?.chord).toBe('G')
    expect(chordEventAt(events, 6)).toBeNull()
  })
})
