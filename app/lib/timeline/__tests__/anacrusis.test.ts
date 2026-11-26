import { describe, it, expect } from 'vitest'
import { anacrusisOffsetBeats, barPositionAt, timelineAnacrusisOffset } from '../anacrusis'
import { createSongTimeline } from '../calculator'

const timeline = (lyrics: string, signature = '4/4') =>
  createSongTimeline(lyrics, 100, signature, { defaultBarsPerLine: 2, defaultBeatsPerChord: 4, intelligentEstimation: false })!

describe('anacrusisOffsetBeats', () => {
  it('is what is missing for the incomplete first bar to reach the next bar line', () => {
    expect(anacrusisOffsetBeats([2, 4], 4)).toBe(2) // A 2 | A |
    expect(anacrusisOffsetBeats([1, 4, 4], 4)).toBe(3) // one beat of pickup
    expect(anacrusisOffsetBeats([3, 4], 4)).toBe(1)
    expect(anacrusisOffsetBeats([1, 4], 3)).toBe(2) // in 3/4
    expect(anacrusisOffsetBeats([1.5, 4], 4)).toBe(2.5)
  })

  it('several short cells that fill a bar are not an anacrusis: F 2 | D 2 |', () => {
    expect(anacrusisOffsetBeats([2, 2, 4], 4)).toBe(0)
    expect(anacrusisOffsetBeats([1, 1, 2, 4], 4)).toBe(0)
  })

  it('short cells that fall short of a bar still are: F 1 | D 1 | E 1 | G |', () => {
    expect(anacrusisOffsetBeats([1, 1, 1, 4], 4)).toBe(1)
    expect(anacrusisOffsetBeats([2, 2, 2, 4], 4)).toBe(2) // a bar and a half of short cells
  })

  it('is 0 when the first cell is a whole bar or longer, or there are no cells', () => {
    expect(anacrusisOffsetBeats([4, 4], 4)).toBe(0)
    expect(anacrusisOffsetBeats([8], 4)).toBe(0)
    expect(anacrusisOffsetBeats([], 4)).toBe(0)
  })

  it('only the leading short cells count, not one after a full bar', () => {
    expect(anacrusisOffsetBeats([4, 2, 4], 4)).toBe(0)
  })
})

describe('timelineAnacrusisOffset', () => {
  it('finds the anacrusis of an instrumental intro written with a short first chord', () => {
    expect(timelineAnacrusisOffset(timeline('[Intro]\nA 2 | A | D | E |').elements, 4)).toBe(2)
    expect(timelineAnacrusisOffset(timeline('A 2 | A |').elements, 4)).toBe(2)
  })

  it('is 0 for a normal intro, and for half bars that fill the bar', () => {
    expect(timelineAnacrusisOffset(timeline('[Intro]\nAm | D | Am | D |').elements, 4)).toBe(0)
    expect(timelineAnacrusisOffset(timeline('[Intro]\nG | Em | Am | F 2 | D 2 |').elements, 4)).toBe(0)
  })

  it('does not count a short chord later in the song, only the way it starts', () => {
    expect(timelineAnacrusisOffset(timeline('[Intro]\nAm | D | F 2 | D 2 |').elements, 4)).toBe(0)
  })

  it('leaves a first lyric line to its levare', () => {
    expect(timelineAnacrusisOffset(timeline('[^2]This happened once be[F:4]fore').elements, 4)).toBe(0)
    expect(timelineAnacrusisOffset(timeline('This happened once be[F:2]fore [G:4]door').elements, 4)).toBe(0)
  })

  it('is 0 without a timeline', () => {
    expect(timelineAnacrusisOffset(undefined, 4)).toBe(0)
    expect(timelineAnacrusisOffset(null, 4)).toBe(0)
    expect(timelineAnacrusisOffset([], 4)).toBe(0)
  })
})

describe('barPositionAt', () => {
  it('without an anacrusis counts from the start of the song', () => {
    expect(barPositionAt(0, 0, 4)).toEqual({ bar: 0, beatInBar: 0 })
    expect(barPositionAt(3, 0, 4)).toEqual({ bar: 0, beatInBar: 3 })
    expect(barPositionAt(4, 0, 4)).toEqual({ bar: 1, beatInBar: 0 })
  })

  it('with a two-beat anacrusis the pickup is the last two beats of the bar before bar 0', () => {
    expect(barPositionAt(0, 2, 4)).toEqual({ bar: -1, beatInBar: 2 })
    expect(barPositionAt(1, 2, 4)).toEqual({ bar: -1, beatInBar: 3 })
    // the second A: beat 2 of the song is the 1 of the first complete bar
    expect(barPositionAt(2, 2, 4)).toEqual({ bar: 0, beatInBar: 0 })
    expect(barPositionAt(5, 2, 4)).toEqual({ bar: 0, beatInBar: 3 })
    expect(barPositionAt(6, 2, 4)).toEqual({ bar: 1, beatInBar: 0 })
  })

  it('works in other meters', () => {
    expect(barPositionAt(0, 2, 3)).toEqual({ bar: -1, beatInBar: 2 })
    expect(barPositionAt(1, 2, 3)).toEqual({ bar: 0, beatInBar: 0 })
    expect(barPositionAt(4, 2, 3)).toEqual({ bar: 1, beatInBar: 0 })
  })

  it('never goes below the start of the song', () => {
    expect(barPositionAt(-3, 2, 4)).toEqual({ bar: -1, beatInBar: 2 })
  })
})
