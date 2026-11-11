import { describe, it, expect } from 'vitest'
import {
  BASS_RHYTHM_PRESETS,
  cleanDrumPattern,
  cleanPattern,
  cleanSongBand,
  drumTemplate,
  fitPattern,
  matchingPreset,
  patternVelocities,
  resolveDrumLanes,
  rhythmHits,
  toggleStep,
} from '../bandPatterns'
import { DRUM_PATTERN_DEFS, laneVelocity } from '../bandSound'

const chords = [
  { chord: 'C', startBeat: 0, durationBeats: 4 },
  { chord: 'G', startBeat: 4, durationBeats: 4 },
]

describe('patterns as text', () => {
  it('reads rest, soft, normal and accent; anything else rests', () => {
    expect(patternVelocities('.oxX')).toEqual([0, 0.45, 0.7, 1])
    expect(cleanPattern('X.. ?x')).toBe('X...x')
  })

  it('fits a pattern to a length', () => {
    expect(fitPattern('Xx', 4)).toBe('Xx..')
    expect(fitPattern('X...x...', 4)).toBe('X...')
  })

  it('a tap goes rest → normal → accent → rest', () => {
    expect(toggleStep('....', 1)).toBe('.x..')
    expect(toggleStep('.x..', 1)).toBe('.X..')
    expect(toggleStep('.X..', 1)).toBe('....')
    expect(toggleStep('.o..', 1)).toBe('....')
  })
})

describe('rhythmHits — the chords of the song played with a rhythm', () => {
  it('without a rhythm every chord is one long hit', () => {
    expect(rhythmHits(chords, undefined, 4)).toEqual([
      { chord: 'C', startBeat: 0, durationBeats: 4, velocity: 0.7 },
      { chord: 'G', startBeat: 4, durationBeats: 4, velocity: 0.7 },
    ])
    expect(rhythmHits(chords, '................', 4)).toHaveLength(2)
  })

  it('quarter notes: four hits per bar, each lasting to the next, on the chord of that moment', () => {
    const hits = rhythmHits(chords, 'X...x...x...x...', 4)
    expect(hits.map((hit) => hit.startBeat)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(hits.map((hit) => hit.chord)).toEqual(['C', 'C', 'C', 'C', 'G', 'G', 'G', 'G'])
    expect(hits.every((hit) => hit.durationBeats === 1)).toBe(true)
    expect(hits[0].velocity).toBe(1)
    expect(hits[1].velocity).toBe(0.7)
  })

  it('the pattern restarts every bar and a chord change mid-bar takes the steps that fall in it', () => {
    const halfBars = [
      { chord: 'C', startBeat: 0, durationBeats: 2 },
      { chord: 'F', startBeat: 2, durationBeats: 2 },
    ]
    // Bass on 1 and the "and" of 2, then 3: the F takes over on beat 3.
    const hits = rhythmHits(halfBars, 'X.....x.X.......', 4)
    expect(hits.map(({ chord, startBeat }) => [chord, startBeat])).toEqual([['C', 0], ['C', 1.5], ['F', 2]])
    expect(hits[2].durationBeats).toBe(2)
  })

  it('a chord that catches no step still sounds once, on its first beat', () => {
    const quick = [
      { chord: 'C', startBeat: 0, durationBeats: 3.5 },
      { chord: 'D', startBeat: 3.5, durationBeats: 0.5 },
    ]
    const hits = rhythmHits(quick, 'X...............', 4)
    expect(hits.map(({ chord, startBeat }) => [chord, startBeat])).toEqual([['C', 0], ['D', 3.5]])
  })

  it('follows the meter: in 3/4 the bar is twelve steps', () => {
    const waltz = [{ chord: 'C', startBeat: 0, durationBeats: 6 }]
    const hits = rhythmHits(waltz, 'X...x...x...', 3)
    expect(hits.map((hit) => hit.startBeat)).toEqual([0, 1, 2, 3, 4, 5])
    expect(hits[3].velocity).toBe(1) // the downbeat of the second bar
  })
})

describe('drum pattern of a song', () => {
  it('a built-in rhythm turns into a pattern that plays the same', () => {
    const rock = drumTemplate('rock')
    expect(rock.kick).toBe('X.......X.X.....')
    expect(rock.snare).toBe('....X.......X...')
    expect(resolveDrumLanes(rock, 'pop')).toEqual(DRUM_PATTERN_DEFS.rock)
  })

  it('plays the song pattern when it has hits, the built-in one otherwise', () => {
    const own = { kick: 'X...X...', snare: '', hat: '' }
    expect(resolveDrumLanes(own, 'rock').kick).toEqual([1, 0, 0, 0, 1, 0, 0, 0])
    expect(resolveDrumLanes(own, 'rock').snare).toEqual(new Array(8).fill(0))
    expect(resolveDrumLanes(undefined, 'rock')).toBe(DRUM_PATTERN_DEFS.rock)
    expect(resolveDrumLanes({ kick: '....', snare: '....', hat: '....' }, 'rock')).toBe(DRUM_PATTERN_DEFS.rock)
  })

  it('keeps every lane the same length', () => {
    expect(cleanDrumPattern({ kick: 'X...x...', snare: 'x', hat: undefined })).toEqual({ kick: 'X...x...', snare: 'x.......', hat: '........' })
  })

  it('a two-bar pattern runs across both bars', () => {
    const lanes = resolveDrumLanes({ kick: 'X...............' + '........X.......', snare: '', hat: '' }, 'rock')
    expect(laneVelocity(lanes.kick, 0, 4)).toBe(1)
    expect(laneVelocity(lanes.kick, 16, 4)).toBe(0)
    expect(laneVelocity(lanes.kick, 24, 4)).toBe(1)
    expect(laneVelocity(lanes.kick, 32, 4)).toBe(1)
  })
})

describe('what is stored with the song', () => {
  it('drops the parts that are empty; nothing left = no band', () => {
    expect(cleanSongBand({ bassRhythm: '....', chordRhythm: 'X...' })).toEqual({ chordRhythm: 'X...' })
    expect(cleanSongBand({ bassRhythm: '', drums: { kick: '....', snare: '', hat: '' } })).toBeUndefined()
    expect(cleanSongBand(undefined)).toBeUndefined()
  })

  it('recognises a preset, whatever the meter cut it to', () => {
    expect(matchingPreset(BASS_RHYTHM_PRESETS, undefined, 16)?.id).toBe('sustained')
    expect(matchingPreset(BASS_RHYTHM_PRESETS, 'X...x...x...x...', 16)?.id).toBe('quarters')
    expect(matchingPreset(BASS_RHYTHM_PRESETS, 'X...x...x...', 12)?.id).toBe('quarters')
    expect(matchingPreset(BASS_RHYTHM_PRESETS, 'X..x............', 16)).toBeUndefined()
  })
})
