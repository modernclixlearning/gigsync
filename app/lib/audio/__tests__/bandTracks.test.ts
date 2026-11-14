import { describe, it, expect } from 'vitest'
import {
  cleanTrack,
  cleanTrackNotes,
  eventsToTrackNotes,
  trackEndBeat,
  trackNotesToEvents,
  trackVoice,
  trackVolume,
} from '../bandTracks'
import { cleanSongBand } from '../bandPatterns'

const note = (beat: number, pitch = 60, beats = 1, velocity = 0.7) => ({ beat, beats, pitch, velocity })

describe('trackVoice', () => {
  it('keeps a voice of the role and falls back to the role default otherwise', () => {
    expect(trackVoice('lead', 'sax')).toBe('sax')
    expect(trackVoice('lead', 'strings')).toBe('leadKeys')
    expect(trackVoice('arrangement', 'choir')).toBe('choir')
    expect(trackVoice('arrangement', undefined)).toBe('strings')
  })
})

describe('cleanTrackNotes', () => {
  it('drops what is not a note, keeps the rest in range and sorts by start', () => {
    const clean = cleanTrackNotes([
      note(4, 64),
      { beat: 1, beats: 0, pitch: 60, velocity: 0.7 }, // no length
      { beat: Number.NaN, beats: 1, pitch: 60, velocity: 0.7 },
      { beat: -2, beats: 1, pitch: 200, velocity: 5 },
      note(0, 72),
    ])
    expect(clean).toEqual([
      { beat: 0, beats: 1, pitch: 72, velocity: 0.7 },
      { beat: 0, beats: 1, pitch: 127, velocity: 1 },
      { beat: 4, beats: 1, pitch: 64, velocity: 0.7 },
    ])
  })

  it('is empty for anything that is not a list', () => {
    expect(cleanTrackNotes(undefined)).toEqual([])
    expect(cleanTrackNotes('x' as unknown as [])).toEqual([])
  })
})

describe('cleanTrack', () => {
  it('is undefined when there is nothing of the song in it', () => {
    expect(cleanTrack('lead', undefined)).toBeUndefined()
    expect(cleanTrack('lead', { voice: 'leadKeys', notes: [] })).toBeUndefined()
  })

  it('keeps a chosen sound or level even before any note is written', () => {
    expect(cleanTrack('lead', { voice: 'sax', notes: [] })).toEqual({ voice: 'sax', notes: [] })
    expect(cleanTrack('arrangement', { notes: [], volume: 30 })).toEqual({ voice: 'strings', notes: [], volume: 30 })
  })

  it('stores the level and the mute only when they are not the default', () => {
    expect(cleanTrack('lead', { voice: 'guitar', notes: [note(0)], volume: 60, muted: false })).toEqual({ voice: 'guitar', notes: [note(0)] })
    expect(cleanTrack('lead', { voice: 'guitar', notes: [note(0)], volume: 140, muted: true })).toEqual({
      voice: 'guitar',
      notes: [note(0)],
      volume: 100,
      muted: true,
    })
    expect(trackVolume(undefined)).toBe(60)
  })
})

describe('beats ↔ seconds', () => {
  it('goes to seconds at the tempo and back, in the same order', () => {
    const notes = [note(4, 67, 0.5), note(0, 60, 2)]
    const events = trackNotesToEvents(notes, 120)
    expect(events[0]).toEqual({ startTimeSeconds: 2, durationSeconds: 0.25, pitchMidi: 67, amplitude: 0.7 })
    expect(eventsToTrackNotes(events, 120)).toEqual(notes)
  })

  it('places a recorded take at the beat it was started on', () => {
    const take = [{ startTimeSeconds: 0.5, durationSeconds: 0.5, pitchMidi: 62, amplitude: 0.9 }]
    expect(eventsToTrackNotes(take, 60, 8)).toEqual([{ beat: 8.5, beats: 0.5, pitch: 62, velocity: 0.9 }])
  })

  it('knows where a track ends', () => {
    expect(trackEndBeat([])).toBe(0)
    expect(trackEndBeat([note(0, 60, 4), note(6, 60, 1.5)])).toBe(7.5)
  })
})

describe('cleanSongBand with tracks', () => {
  it('keeps the written tracks and drops the empty ones', () => {
    expect(cleanSongBand({ lead: { voice: 'sax', notes: [note(0)] }, arrangement: { voice: 'strings', notes: [] } })).toEqual({
      lead: { voice: 'sax', notes: [note(0)] },
    })
    expect(cleanSongBand({ lead: { voice: 'leadKeys', notes: [] } })).toBeUndefined()
  })
})
