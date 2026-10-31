/**
 * MIDI note input (pure, no Web MIDI / React dependencies): parsing Note On /
 * Note Off / sustain-pedal messages and turning a played performance into the
 * `NoteEvent[]` the chord detection already understands.
 */

import type { NoteEvent } from '~/lib/audioAnalysis/types'

/** 0-based MIDI channel used by drum pads by convention (channel 10). */
export const MIDI_DRUM_CHANNEL = 9

const SUSTAIN_CC = 64

export type MIDINoteMessage =
  | { type: 'note-on'; channel: number; pitch: number; velocity: number }
  | { type: 'note-off'; channel: number; pitch: number }
  | { type: 'sustain'; channel: number; down: boolean }

/**
 * Classifies a raw MIDI message. Note On with velocity 0 is a Note Off (running
 * status keyboards send it that way). Returns null for anything else (clock,
 * other CCs, pitch bend, aftertouch…).
 */
export function parseMIDINoteMessage(data: ArrayLike<number> | null | undefined): MIDINoteMessage | null {
  if (!data || data.length < 3) return null
  const status = data[0] & 0xf0
  const channel = data[0] & 0x0f
  const pitch = data[1] & 0x7f
  const value = data[2] & 0x7f
  if (status === 0x90) {
    return value > 0 ? { type: 'note-on', channel, pitch, velocity: value } : { type: 'note-off', channel, pitch }
  }
  if (status === 0x80) return { type: 'note-off', channel, pitch }
  if (status === 0xb0 && pitch === SUSTAIN_CC) return { type: 'sustain', channel, down: value >= 64 }
  return null
}

export interface NoteRecorder {
  noteOn: (pitch: number, velocity: number, time: number) => void
  noteOff: (pitch: number, time: number) => void
  sustain: (down: boolean, time: number) => void
  /** Pitches sounding now (held, or kept by the pedal), ascending. */
  sounding: () => number[]
  /** Completed notes so far, plus the sounding ones cut at `time`. */
  notesUntil: (time: number) => NoteEvent[]
  /** End every sounding note at `time` and return all notes. */
  finish: (time: number) => NoteEvent[]
}

interface OpenNote {
  start: number
  velocity: number
  /** Key released while the pedal was down: ends when the pedal goes up. */
  released: boolean
}

/**
 * Collects a performance. Times are in seconds from the recording's first
 * downbeat (negative = during the count-in). Notes are clipped to start at 0 so
 * a chord played a hair early still counts for bar 1; notes that ended before
 * 0 are dropped. The sustain pedal holds released notes until it goes up, as on
 * a piano.
 */
export function createNoteRecorder(): NoteRecorder {
  const open = new Map<number, OpenNote>()
  const done: NoteEvent[] = []
  let pedal = false

  const close = (pitch: number, time: number) => {
    const note = open.get(pitch)
    if (!note) return
    open.delete(pitch)
    const start = Math.max(0, note.start)
    if (time <= start) return
    done.push({
      startTimeSeconds: start,
      durationSeconds: time - start,
      pitchMidi: pitch,
      amplitude: note.velocity / 127,
    })
  }

  const cutOpen = (time: number): NoteEvent[] =>
    [...open.entries()]
      .map(([pitch, note]) => ({ pitch, note, start: Math.max(0, note.start) }))
      .filter(({ start }) => time > start)
      .map(({ pitch, note, start }) => ({
        startTimeSeconds: start,
        durationSeconds: time - start,
        pitchMidi: pitch,
        amplitude: note.velocity / 127,
      }))

  return {
    noteOn(pitch, velocity, time) {
      // Re-striking a held/pedalled key ends the previous note there.
      close(pitch, time)
      open.set(pitch, { start: time, velocity, released: false })
    },
    noteOff(pitch, time) {
      const note = open.get(pitch)
      if (!note) return
      if (pedal) note.released = true
      else close(pitch, time)
    },
    sustain(down, time) {
      pedal = down
      if (down) return
      for (const [pitch, note] of [...open.entries()]) if (note.released) close(pitch, time)
    },
    sounding: () => [...open.keys()].sort((a, b) => a - b),
    notesUntil: (time) => [...done, ...cutOpen(time)],
    finish(time) {
      for (const pitch of [...open.keys()]) close(pitch, time)
      pedal = false
      return [...done]
    },
  }
}
