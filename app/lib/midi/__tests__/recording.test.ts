import { describe, it, expect } from 'vitest'
import { createNoteRecorder, parseMIDINoteMessage } from '../notes'
import { describeSounding, positionAt, recordingToProgression } from '../recording'
import { progressionToBarLines } from '~/lib/audioAnalysis/chordproOutput'
import { detectChordProgression } from '~/lib/audioAnalysis/chords'
import type { NoteEvent } from '~/lib/audioAnalysis/types'

const C = [48, 60, 64, 67]
const Am = [45, 60, 64, 69]
const F = [41, 60, 65, 69]
const G = [43, 59, 62, 67]

/** A chord held from `start` for `beats` beats at 120 BPM (0.5 s per beat). */
function chord(pitches: number[], startBeat: number, beats: number, early = 0): NoteEvent[] {
  return pitches.map((pitchMidi) => ({
    startTimeSeconds: startBeat * 0.5 - early,
    durationSeconds: beats * 0.5 - 0.05,
    pitchMidi,
    amplitude: 0.7,
  }))
}

describe('parseMIDINoteMessage', () => {
  it('reads note on/off (velocity 0 = off) and the sustain pedal, with the channel', () => {
    expect(parseMIDINoteMessage([0x90, 60, 100])).toEqual({ type: 'note-on', channel: 0, pitch: 60, velocity: 100 })
    expect(parseMIDINoteMessage([0x91, 60, 0])).toEqual({ type: 'note-off', channel: 1, pitch: 60 })
    expect(parseMIDINoteMessage([0x80, 60, 64])).toEqual({ type: 'note-off', channel: 0, pitch: 60 })
    expect(parseMIDINoteMessage([0x99, 36, 90])).toMatchObject({ type: 'note-on', channel: 9 })
    expect(parseMIDINoteMessage([0xb0, 64, 127])).toEqual({ type: 'sustain', channel: 0, down: true })
    expect(parseMIDINoteMessage([0xb0, 64, 0])).toEqual({ type: 'sustain', channel: 0, down: false })
  })

  it('ignores clock, other CCs and short messages', () => {
    expect(parseMIDINoteMessage([0xf8])).toBeNull()
    expect(parseMIDINoteMessage([0xb0, 1, 64])).toBeNull()
    expect(parseMIDINoteMessage([0xe0, 0, 64])).toBeNull()
    expect(parseMIDINoteMessage(null)).toBeNull()
  })
})

describe('createNoteRecorder', () => {
  it('turns note on/off pairs into notes with velocity as amplitude', () => {
    const rec = createNoteRecorder()
    rec.noteOn(60, 127, 0.5)
    rec.noteOff(60, 1.5)
    expect(rec.finish(2)).toEqual([{ startTimeSeconds: 0.5, durationSeconds: 1, pitchMidi: 60, amplitude: 1 }])
  })

  it('clips notes played during the count-in to the first downbeat and drops those that ended before it', () => {
    const rec = createNoteRecorder()
    rec.noteOn(50, 64, -1)
    rec.noteOff(50, -0.5)
    rec.noteOn(60, 64, -0.03)
    rec.noteOff(60, 1)
    expect(rec.finish(2)).toEqual([expect.objectContaining({ pitchMidi: 60, startTimeSeconds: 0, durationSeconds: 1 })])
  })

  it('holds released keys while the sustain pedal is down', () => {
    const rec = createNoteRecorder()
    rec.sustain(true, 0)
    rec.noteOn(60, 100, 0)
    rec.noteOff(60, 0.2)
    expect(rec.sounding()).toEqual([60])
    rec.sustain(false, 1.8)
    expect(rec.sounding()).toEqual([])
    expect(rec.finish(3)[0].durationSeconds).toBeCloseTo(1.8)
  })

  it('ends a re-struck key where it was struck again, and cuts sounding notes on finish', () => {
    const rec = createNoteRecorder()
    rec.sustain(true, 0)
    rec.noteOn(60, 100, 0)
    rec.noteOff(60, 0.1)
    rec.noteOn(60, 100, 1)
    const notes = rec.finish(1.5)
    expect(notes.map((n) => [n.startTimeSeconds, n.durationSeconds])).toEqual([
      [0, 1],
      [1, 0.5],
    ])
  })

  it('notesUntil includes the keys still held, without closing them', () => {
    const rec = createNoteRecorder()
    rec.noteOn(60, 100, 0)
    expect(rec.notesUntil(1)).toEqual([expect.objectContaining({ pitchMidi: 60, durationSeconds: 1 })])
    expect(rec.sounding()).toEqual([60])
  })
})

describe('recordingToProgression', () => {
  const grid = { bpm: 120, beatsPerBar: 4 }

  it('reads one chord per bar on the click grid, even when played a little early', () => {
    const notes = [...chord(C, 0, 4), ...chord(Am, 4, 4, 0.04), ...chord(F, 8, 4, 0.03), ...chord(G, 12, 4)]
    const progression = recordingToProgression(notes, 8, grid)
    expect(progressionToBarLines(progression)).toEqual(['C | Am | F | G |'])
  })

  it('splits a bar with two chords into halves', () => {
    const notes = [...chord(C, 0, 4), ...chord(F, 4, 2), ...chord(G, 6, 2)]
    expect(progressionToBarLines(recordingToProgression(notes, 4, grid))).toEqual(['C | F 2 | G 2 |'])
  })

  it('keeps the bar in progress when stopped before the bar line', () => {
    const notes = [...chord(C, 0, 4), ...chord(G, 4, 3)]
    expect(progressionToBarLines(recordingToProgression(notes, 3.4, grid))).toEqual(['C | G |'])
  })

  it('does not shift the bars to guess the downbeat: the click decides it', () => {
    // Chords change on beat 3 of each bar; a guessed downbeat would move there.
    const notes = [...chord(C, 0, 2), ...chord(G, 2, 4), ...chord(Am, 6, 4), ...chord(F, 10, 2)]
    const fixed = recordingToProgression(notes, 6, grid)
    expect(fixed.downbeatOffset).toBe(0)
    expect(fixed.bars[0].startTime).toBe(0)
    const beats = Array.from({ length: 12 }, (_, i) => i * 0.5)
    expect(detectChordProgression(notes, beats, 4, { downbeatOffset: 2 }).downbeatOffset).toBe(2)
  })

  it('is empty when nothing was played', () => {
    expect(recordingToProgression([], 4, grid).bars).toEqual([])
  })
})

describe('positionAt / describeSounding', () => {
  it('gives bar and beat (1-based) on the grid', () => {
    expect(positionAt(0, { bpm: 120, beatsPerBar: 4 })).toEqual({ bar: 1, beat: 1 })
    expect(positionAt(2.5, { bpm: 120, beatsPerBar: 4 })).toEqual({ bar: 2, beat: 2 })
    expect(positionAt(1.5, { bpm: 120, beatsPerBar: 3 })).toEqual({ bar: 2, beat: 1 })
  })

  it('names a held chord, or lists the notes when it is not one', () => {
    expect(describeSounding([57, 60, 64])).toBe('Am')
    expect(describeSounding([48, 64, 67, 70])).toBe('C7')
    expect(describeSounding([43, 55, 59, 62])).toBe('G')
    expect(describeSounding([48, 55])).toBe('C G')
    expect(describeSounding([])).toBeNull()
  })
})
