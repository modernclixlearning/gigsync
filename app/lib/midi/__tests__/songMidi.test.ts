import { describe, it, expect } from 'vitest'
import { songsToMidi, parseTimeSignature, DEFAULT_SONG_MIDI_OPTIONS } from '../songMidi'
import { vlq, PPQ } from '../smf'
import type { Song } from '~/types/setlist'

const song = (extra: Partial<Song> = {}): Song => ({
  id: 'a',
  title: 'Prueba',
  artist: 'X',
  bpm: 120,
  key: 'C',
  timeSignature: '4/4',
  duration: 60,
  lyrics: '[C]Hola [G]mundo\n[Am]adios [F]todo',
  tags: [],
  timesPlayed: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...extra,
})

const text = (bytes: Uint8Array, at: number, len: number) => String.fromCharCode(...bytes.slice(at, at + len))

interface Chunk {
  type: string
  data: Uint8Array
}
function chunks(bytes: Uint8Array): Chunk[] {
  const out: Chunk[] = []
  let at = 0
  while (at < bytes.length) {
    const len = (bytes[at + 4] << 24) | (bytes[at + 5] << 16) | (bytes[at + 6] << 8) | bytes[at + 7]
    out.push({ type: text(bytes, at, 4), data: bytes.slice(at + 8, at + 8 + len) })
    at += 8 + len
  }
  return out
}

/** Decoded note-ons of a track: absolute tick, channel, pitch. */
function noteOns(track: Uint8Array): { tick: number; channel: number; pitch: number }[] {
  const out: { tick: number; channel: number; pitch: number }[] = []
  let i = 0
  let tick = 0
  while (i < track.length) {
    let delta = 0
    while (track[i] & 0x80) delta = (delta << 7) | (track[i++] & 0x7f)
    delta = (delta << 7) | track[i++]
    tick += delta
    const status = track[i]
    if (status === 0xff) {
      i += 2
      let len = 0
      while (track[i] & 0x80) len = (len << 7) | (track[i++] & 0x7f)
      len = (len << 7) | track[i++]
      i += len
    } else {
      if ((status & 0xf0) === 0x90) out.push({ tick, channel: status & 0x0f, pitch: track[i + 1] })
      i += 3
    }
  }
  return out
}

describe('vlq', () => {
  it('encodes variable-length quantities', () => {
    expect(vlq(0)).toEqual([0])
    expect(vlq(127)).toEqual([0x7f])
    expect(vlq(128)).toEqual([0x81, 0x00])
    expect(vlq(480)).toEqual([0x83, 0x60])
  })
})

describe('parseTimeSignature', () => {
  it('reads n/d and falls back to 4/4', () => {
    expect(parseTimeSignature('6/8')).toEqual({ beats: 6, unit: 8 })
    expect(parseTimeSignature('rare')).toEqual({ beats: 4, unit: 4 })
  })
})

describe('songsToMidi', () => {
  it('writes a format-1 file with conductor, chords and bass tracks', () => {
    const bytes = songsToMidi([song()])
    const [header, ...tracks] = chunks(bytes)
    expect(header.type).toBe('MThd')
    expect(Array.from(header.data)).toEqual([0, 1, 0, 3, PPQ >> 8, PPQ & 0xff])
    expect(tracks.map((t) => t.type)).toEqual(['MTrk', 'MTrk', 'MTrk'])
  })

  it('puts the chord roots in the bass track, one per chord, at the chord start', () => {
    const bass = chunks(songsToMidi([song()]))[3]
    const notes = noteOns(bass.data)
    expect(notes.length).toBe(4)
    expect(notes.every((n) => n.channel === 1)).toBe(true)
    // C, G, A, F → pitch classes 0, 7, 9, 5
    expect(notes.map((n) => n.pitch % 12)).toEqual([0, 7, 9, 5])
    expect(notes[0].tick).toBe(0)
    expect(notes[1].tick).toBeGreaterThan(0)
  })

  it('adds the keyboard take as its own track and a click on request', () => {
    const take = { bpm: 120, beatsPerBar: 4, durationSeconds: 4, notes: [{ startTimeSeconds: 1, durationSeconds: 0.5, pitchMidi: 64, amplitude: 0.8 }] }
    const bytes = songsToMidi([song({ midiTake: take })], { ...DEFAULT_SONG_MIDI_OPTIONS, click: true })
    const tracks = chunks(bytes).slice(1)
    expect(tracks).toHaveLength(5)
    const melody = noteOns(tracks[3].data)
    expect(melody).toEqual([{ tick: 2 * PPQ, channel: 2, pitch: 64 }]) // 1 s at 120 bpm = 2 beats
    const click = noteOns(tracks[4].data)
    expect(click.every((n) => n.channel === 9)).toBe(true)
    expect(click.length).toBeGreaterThanOrEqual(8)
  })

  it('lines several songs up one after another, each at its own tempo', () => {
    const bytes = songsToMidi([song({ bpm: 100 }), song({ id: 'b', title: 'Otra', bpm: 140 })])
    const bass = noteOns(chunks(bytes)[3].data)
    // 8 chords in total; the second song starts after the first one's bars plus a gap bar
    expect(bass.length).toBe(8)
    expect(bass[4].tick).toBeGreaterThanOrEqual(8 * PPQ + 4 * PPQ)
  })

  it('leaves out the tracks that were not asked for', () => {
    const bytes = songsToMidi([song()], { chords: true, bass: false, melody: false, click: false })
    expect(chunks(bytes)).toHaveLength(3)
  })
})
