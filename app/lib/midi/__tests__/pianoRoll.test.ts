import { describe, it, expect } from 'vitest'
import { isBlackKey, noteName, pitchRange, quantizeNotes } from '../pianoRoll'
import type { NoteEvent } from '~/lib/audioAnalysis/types'

const note = (pitchMidi: number, startTimeSeconds: number, durationSeconds: number): NoteEvent => ({
  pitchMidi,
  startTimeSeconds,
  durationSeconds,
  amplitude: 0.8,
})

describe('noteName / isBlackKey', () => {
  it('names notes with their octave (middle C = C4)', () => {
    expect(noteName(60)).toBe('C4')
    expect(noteName(51)).toBe('Eb3')
    expect(noteName(71)).toBe('B4')
  })

  it('tells black keys apart', () => {
    expect([60, 61, 62, 63, 64, 65, 66].map(isBlackKey)).toEqual([false, true, false, true, false, false, true])
  })
})

describe('pitchRange', () => {
  it('defaults to C3–C6 without notes', () => {
    expect(pitchRange([])).toEqual({ low: 48, high: 84 })
  })

  it('covers the notes with headroom, at least two octaves, from a C', () => {
    const { low, high } = pitchRange([note(64, 0, 1), note(67, 0, 1)])
    expect(low % 12).toBe(0)
    expect(low).toBeLessThanOrEqual(62)
    expect(high).toBeGreaterThanOrEqual(69)
    expect(high - low).toBeGreaterThanOrEqual(24)
  })
})

describe('quantizeNotes', () => {
  it('snaps starts and ends to the grid', () => {
    const [q] = quantizeNotes([note(60, 0.47, 0.98)], 0.25)
    expect(q.startTimeSeconds).toBeCloseTo(0.5)
    expect(q.durationSeconds).toBeCloseTo(1)
  })

  it('never leaves a note shorter than one step, nor before 0', () => {
    const [short, early] = quantizeNotes([note(60, 1.02, 0.05), note(64, -0.04, 0.5)], 0.25)
    expect(short.startTimeSeconds).toBeCloseTo(1)
    expect(short.durationSeconds).toBeCloseTo(0.25)
    expect(early.startTimeSeconds).toBe(0)
  })
})
