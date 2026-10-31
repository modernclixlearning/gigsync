import { describe, it, expect } from 'vitest'
import { isBlackKey, moveNote, noteName, pitchRange, quantizeNotes, resizeNote, snapTime } from '../pianoRoll'
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

describe('snapTime / moveNote / resizeNote', () => {
  const range = { low: 48, high: 72 }

  it('snaps to the nearest step, or the one below', () => {
    expect(snapTime(0.37, 0.25)).toBeCloseTo(0.25)
    expect(snapTime(0.4, 0.25)).toBeCloseTo(0.5)
    expect(snapTime(0.49, 0.25, true)).toBeCloseTo(0.25)
    expect(snapTime(0.5, 0.25, true)).toBeCloseTo(0.5)
  })

  it('moves a note onto the grid, keeping its length, within time 0 and the pitch range', () => {
    expect(moveNote(note(60, 0.1, 0.8), 0.52, 3, 0.25, range)).toMatchObject({
      pitchMidi: 63,
      startTimeSeconds: 0.5,
      durationSeconds: 0.8,
    })
    expect(moveNote(note(70, 0.2, 0.5), -1, 5, 0.25, range)).toMatchObject({ pitchMidi: 72, startTimeSeconds: 0 })
  })

  it('stretches or shortens a note to the grid, never below one step', () => {
    expect(resizeNote(note(60, 0, 0.9), 0.4, 0.25).durationSeconds).toBeCloseTo(1.25)
    expect(resizeNote(note(60, 1, 0.5), -2, 0.25).durationSeconds).toBeCloseTo(0.25)
  })
})
