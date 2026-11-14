/**
 * The written tracks of ONE song (pure): the lead melody and the arrangement.
 * Unlike the drums, the bass and the chords — which follow a pattern — these
 * are written note by note (on the piano roll, or played on a controller).
 *
 * Notes are kept in beats from the start of the song, so they follow the
 * song's tempo: change the BPM and the melody still lands on its chords.
 */

import type { NoteEvent } from '~/lib/audioAnalysis/types'

export const TRACK_ROLES = ['lead', 'arrangement'] as const
export type TrackRole = (typeof TRACK_ROLES)[number]

export const LEAD_VOICES = ['leadKeys', 'guitar', 'sax'] as const
export type LeadVoice = (typeof LEAD_VOICES)[number]

export const ARRANGEMENT_VOICES = ['strings', 'brass', 'choir'] as const
export type ArrangementVoice = (typeof ARRANGEMENT_VOICES)[number]

export type TrackVoice = LeadVoice | ArrangementVoice

export const TRACK_VOICES: Record<TrackRole, readonly TrackVoice[]> = {
  lead: LEAD_VOICES,
  arrangement: ARRANGEMENT_VOICES,
}

export const DEFAULT_TRACK_VOICE: Record<TrackRole, TrackVoice> = { lead: 'leadKeys', arrangement: 'strings' }

export const TRACK_ROLE_LABELS: Record<TrackRole, string> = { lead: 'Melodía', arrangement: 'Arreglos' }

export const TRACK_VOICE_LABELS: Record<TrackVoice, string> = {
  leadKeys: 'Teclado solista',
  guitar: 'Guitarra eléctrica',
  sax: 'Saxo',
  strings: 'Cuerdas',
  brass: 'Metales',
  choir: 'Coro',
}

/** Level of a track, 0–100. */
export const DEFAULT_TRACK_VOLUME = 60

/** More than any song needs; keeps a corrupt import from freezing the player. */
export const MAX_TRACK_NOTES = 5000

/** One written note. */
export interface TrackNote {
  /** Beats (quarter notes) from the start of the song. */
  beat: number
  /** Length in beats. */
  beats: number
  /** MIDI pitch (60 = middle C). */
  pitch: number
  /** 0–1 */
  velocity: number
}

export interface BandTrack {
  voice: TrackVoice
  notes: TrackNote[]
  /** 0–100. Unset = the default level. */
  volume?: number
  /** Written but silent. */
  muted?: boolean
}

const round = (value: number, decimals: number) => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** The voice to use for a role: the one asked for when it belongs to the role, otherwise the role's default. */
export function trackVoice(role: TrackRole, voice: string | undefined | null): TrackVoice {
  return (TRACK_VOICES[role] as readonly string[]).includes(voice ?? '') ? (voice as TrackVoice) : DEFAULT_TRACK_VOICE[role]
}

/** Valid notes only, each in range — in the order given (the piano roll works by index). */
function normalizeTrackNotes(notes: readonly Partial<TrackNote>[] | undefined | null): TrackNote[] {
  if (!Array.isArray(notes)) return []
  const clean: TrackNote[] = []
  for (const note of notes.slice(0, MAX_TRACK_NOTES)) {
    if (!note) continue
    const { beat, beats, pitch, velocity } = note
    if (![beat, beats, pitch].every((n) => typeof n === 'number' && Number.isFinite(n))) continue
    if (beats! <= 0) continue
    clean.push({
      beat: round(Math.max(0, beat!), 4),
      beats: round(beats!, 4),
      pitch: clamp(Math.round(pitch!), 0, 127),
      velocity: round(clamp(typeof velocity === 'number' && Number.isFinite(velocity) ? velocity : 0.7, 0.05, 1), 3),
    })
  }
  return clean
}

/** Notes as stored → clean: valid numbers only, in range, sorted by start. */
export function cleanTrackNotes(notes: readonly Partial<TrackNote>[] | undefined | null): TrackNote[] {
  return normalizeTrackNotes(notes).sort((a, b) => a.beat - b.beat || a.pitch - b.pitch)
}

export function trackVolume(track: Pick<BandTrack, 'volume'> | undefined | null): number {
  const volume = track?.volume
  return typeof volume === 'number' && Number.isFinite(volume) ? clamp(Math.round(volume), 0, 100) : DEFAULT_TRACK_VOLUME
}

export function trackHasNotes(track: Pick<BandTrack, 'notes'> | undefined | null): boolean {
  return Array.isArray(track?.notes) && track!.notes.length > 0
}

/**
 * A track as stored → clean, or undefined when there is nothing of the song's
 * own in it (no notes and every setting at its default).
 */
export function cleanTrack(role: TrackRole, track: Partial<BandTrack> | undefined | null): BandTrack | undefined {
  if (!track) return undefined
  const voice = trackVoice(role, track.voice)
  const notes = cleanTrackNotes(track.notes)
  const volume = trackVolume(track)
  const muted = track.muted === true
  if (notes.length === 0 && voice === DEFAULT_TRACK_VOICE[role] && volume === DEFAULT_TRACK_VOLUME && !muted) return undefined
  const clean: BandTrack = { voice, notes }
  if (volume !== DEFAULT_TRACK_VOLUME) clean.volume = volume
  if (muted) clean.muted = true
  return clean
}

/** The beat a track's last note ends on (0 without notes). */
export function trackEndBeat(notes: readonly TrackNote[]): number {
  return notes.reduce((end, note) => Math.max(end, note.beat + note.beats), 0)
}

/* ── Beats ↔ seconds (the piano roll and the recorder work in seconds) ───── */

const secondsPerBeat = (bpm: number) => 60 / Math.max(1, bpm)

/** Track notes as timed note events at `bpm`. */
export function trackNotesToEvents(notes: readonly TrackNote[], bpm: number): NoteEvent[] {
  const beat = secondsPerBeat(bpm)
  return notes.map((note) => ({
    startTimeSeconds: note.beat * beat,
    durationSeconds: note.beats * beat,
    pitchMidi: note.pitch,
    amplitude: note.velocity,
  }))
}

/** Timed note events played at `bpm` as track notes, `offsetBeats` into the song — same order as the events. */
export function eventsToTrackNotes(events: readonly NoteEvent[], bpm: number, offsetBeats = 0): TrackNote[] {
  const beat = secondsPerBeat(bpm)
  return normalizeTrackNotes(
    events.map((event) => ({
      beat: event.startTimeSeconds / beat + offsetBeats,
      beats: event.durationSeconds / beat,
      pitch: event.pitchMidi,
      velocity: event.amplitude,
    })),
  )
}
