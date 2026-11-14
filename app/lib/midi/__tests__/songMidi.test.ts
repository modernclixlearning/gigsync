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

/** Decoded note-ons of a track: absolute tick, channel, pitch, velocity. */
function noteOns(track: Uint8Array): { tick: number; channel: number; pitch: number; velocity: number }[] {
  const out: { tick: number; channel: number; pitch: number; velocity: number }[] = []
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
    } else if ((status & 0xf0) === 0xc0) {
      i += 2 // program change: one data byte
    } else {
      if ((status & 0xf0) === 0x90) out.push({ tick, channel: status & 0x0f, pitch: track[i + 1], velocity: track[i + 2] })
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
    // In the bass guitar's bottom octave (E1–D#2): C2, G1, A1, F1
    expect(notes.map((n) => n.pitch)).toEqual([36, 31, 33, 29])
    expect(notes[0].tick).toBe(0)
    expect(notes[1].tick).toBeGreaterThan(0)
  })

  it('adds the keyboard take as its own track and a click on request', () => {
    const take = { bpm: 120, beatsPerBar: 4, durationSeconds: 4, notes: [{ startTimeSeconds: 1, durationSeconds: 0.5, pitchMidi: 64, amplitude: 0.8 }] }
    const bytes = songsToMidi([song({ midiTake: take })], { ...DEFAULT_SONG_MIDI_OPTIONS, click: true })
    const tracks = chunks(bytes).slice(1)
    expect(tracks).toHaveLength(5)
    const melody = noteOns(tracks[3].data)
    expect(melody).toMatchObject([{ tick: 2 * PPQ, channel: 2, pitch: 64 }]) // 1 s at 120 bpm = 2 beats
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
    const bytes = songsToMidi([song()], { chords: true, bass: false, drums: false, lead: false, arrangement: false, melody: false, click: false })
    expect(chunks(bytes)).toHaveLength(3)
  })
})

describe('songsToMidi — the tracks written for the song', () => {
  const lead = {
    voice: 'sax' as const,
    notes: [
      { beat: 0, beats: 1, pitch: 72, velocity: 1 },
      { beat: 1.5, beats: 0.5, pitch: 74, velocity: 0.5 },
    ],
  }

  it('adds the lead melody and the arrangement as their own tracks, on the beat they were written', () => {
    const without = chunks(songsToMidi([song()]))
    const arrangement = { voice: 'strings' as const, notes: [{ beat: 4, beats: 4, pitch: 55, velocity: 0.7 }] }
    const withTracks = chunks(songsToMidi([{ ...song(), band: { lead, arrangement } }]))
    expect(withTracks).toHaveLength(without.length + 2)

    expect(noteOns(withTracks[4].data)).toEqual([
      { tick: 0, channel: 3, pitch: 72, velocity: 127 },
      { tick: 1.5 * PPQ, channel: 3, pitch: 74, velocity: 64 },
    ])
    expect(noteOns(withTracks[5].data)).toEqual([{ tick: 4 * PPQ, channel: 4, pitch: 55, velocity: 89 }])
    // Each track opens on the General MIDI sound closest to its voice (alto sax = 65).
    expect([...withTracks[4].data].join(',')).toContain([0xc3, 65].join(','))
  })

  it('leaves out a silenced track and one that was not asked for', () => {
    const without = chunks(songsToMidi([song()]))
    expect(chunks(songsToMidi([{ ...song(), band: { lead: { ...lead, muted: true } } }]))).toHaveLength(without.length)
    expect(chunks(songsToMidi([{ ...song(), band: { lead } }], { ...DEFAULT_SONG_MIDI_OPTIONS, lead: false }))).toHaveLength(without.length)
  })
})

describe('songsToMidi — the patterns written for the song', () => {
  it('plays the bass with the song rhythm: quarter notes instead of one long note per chord', () => {
    const plain = noteOns(chunks(songsToMidi([song()]))[3].data)
    const withRhythm = noteOns(chunks(songsToMidi([{ ...song(), band: { bassRhythm: 'X...x...x...x...' } }]))[3].data)
    expect(withRhythm.length).toBeGreaterThan(plain.length)
    // Every hit is on a beat, and the first one of the song is the accent.
    expect(withRhythm.every((n) => n.tick % PPQ === 0)).toBe(true)
    expect(withRhythm[0].velocity).toBeGreaterThan(withRhythm[1].velocity)
  })

  it('adds a drum track on channel 10 only for songs with a drum pattern of their own', () => {
    const without = chunks(songsToMidi([song()]))
    const drums = { kick: 'X...............', snare: '....X.......X...', hat: '................' }
    const withDrums = chunks(songsToMidi([{ ...song(), band: { drums } }]))
    expect(withDrums).toHaveLength(without.length + 1)

    const notes = noteOns(withDrums[4].data)
    expect(notes.every((n) => n.channel === 9)).toBe(true)
    expect(new Set(notes.map((n) => n.pitch))).toEqual(new Set([36, 38]))
    // Kick on every downbeat, snare on 2 and 4.
    const firstBar = notes.filter((n) => n.tick < 4 * PPQ)
    expect(firstBar.filter((n) => n.pitch === 36).map((n) => n.tick)).toEqual([0])
    expect(firstBar.filter((n) => n.pitch === 38).map((n) => n.tick)).toEqual([PPQ, 3 * PPQ])
  })
})
