import { describe, it, expect } from 'vitest'
import { beatAccent, beatCountLabel, beatGroupSize, meterOf } from '../beatAccent'

const bar = (beats: number, unit: number) =>
  Array.from({ length: beats }, (_, i) => beatAccent(i, beats, unit))

describe('beatAccent', () => {
  it('accents the 1st and the 4th eighth of a 6/8 bar', () => {
    expect(bar(6, 8)).toEqual(['strong', 'normal', 'normal', 'group', 'normal', 'normal'])
  })

  it('groups 9/8 and 12/8 by three', () => {
    expect(bar(9, 8)).toEqual([
      'strong', 'normal', 'normal', 'group', 'normal', 'normal', 'group', 'normal', 'normal',
    ])
    expect(bar(12, 8).map((a, i) => (a === 'normal' ? '' : i))).toEqual([0, '', '', 3, '', '', 6, '', '', 9, '', ''])
  })

  it('only marks the first beat in simple meters', () => {
    expect(bar(4, 4)).toEqual(['strong', 'normal', 'normal', 'normal'])
    expect(bar(3, 4)).toEqual(['strong', 'normal', 'normal'])
    expect(bar(7, 8)).toEqual(['strong', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal'])
  })

  it('does not group a /4 meter even when the count is a multiple of three', () => {
    expect(bar(6, 4)).toEqual(['strong', 'normal', 'normal', 'normal', 'normal', 'normal'])
    expect(beatGroupSize(3, 8)).toBe(0)
    expect(beatGroupSize(6, 8)).toBe(3)
  })
})

describe('beatCountLabel', () => {
  const count = (beats: number, unit: number) =>
    Array.from({ length: beats }, (_, i) => beatCountLabel(i, beats, unit))

  it('counts a compound meter by groups of three: 1 2 3 1 2 3', () => {
    expect(count(6, 8)).toEqual([1, 2, 3, 1, 2, 3])
    expect(count(9, 8)).toEqual([1, 2, 3, 1, 2, 3, 1, 2, 3])
  })

  it('counts a simple meter through the bar', () => {
    expect(count(4, 4)).toEqual([1, 2, 3, 4])
    expect(count(7, 8)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
})

describe('meterOf', () => {
  it('reads beats and unit, falling back to 4/4', () => {
    expect(meterOf('12/8')).toEqual({ beats: 12, unit: 8 })
    expect(meterOf('nonsense')).toEqual({ beats: 4, unit: 4 })
  })
})
