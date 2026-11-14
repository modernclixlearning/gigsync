/**
 * Songs → a Standard MIDI File (pure): a tempo/marker track, the chords and the
 * bass voiced like the player's band and played with the rhythm written for
 * the song, its drum pattern (if it has one), the lead melody and the
 * arrangement written for it, the keyboard take (if one was saved) and, optionally, a click. Several songs go one after another, a bar apart, each
 * with its own tempo, time signature and marker — drag the file into Ableton
 * and the arrangement follows.
 */

import { bassInstrumentPitch, voiceChord } from '~/lib/audio/chordVoicing'
import { DRUM_PARTS, cleanDrumPattern, patternHasHits, patternVelocities, rhythmHits, stepsPerBar } from '~/lib/audio/bandPatterns'
import { STEPS_PER_BEAT, laneVelocity, type DrumPart } from '~/lib/audio/bandSound'
import {
  TRACK_ROLES,
  TRACK_ROLE_LABELS,
  activeTakeNotes,
  drumTakeHits,
  trackEndBeat,
  trackHasNotes,
  type TrackNote,
  type TrackRole,
  type TrackVoice,
} from '~/lib/audio/bandTracks'
import { chordEvents } from '~/lib/timeline/chordEvents'
import { createSongTimeline } from '~/lib/timeline/calculator'
import type { Song } from '~/types/setlist'
import {
  PPQ,
  markerEvent,
  noteEvents,
  programEvent,
  tempoEvent,
  timeSignatureEvent,
  writeSmf,
  type SmfEvent,
  type SmfTrack,
} from './smf'

export interface SongMidiOptions {
  chords: boolean
  bass: boolean
  /** The drum pattern written for the song (songs without one get no drums). */
  drums: boolean
  /** The lead melody written for the song. */
  lead: boolean
  /** The arrangement written for the song. */
  arrangement: boolean
  /** The keyboard take the chords were recorded from. */
  melody: boolean
  click: boolean
}

export const DEFAULT_SONG_MIDI_OPTIONS: SongMidiOptions = { chords: true, bass: true, drums: true, lead: true, arrangement: true, melody: true, click: false }

const CH_CHORDS = 0
const CH_BASS = 1
const CH_MELODY = 2
const CH_CLICK = 9
const CH_TRACK: Record<TrackRole, number> = { lead: 3, arrangement: 4 }
/** General MIDI program (0-based) closest to each voice, so the DAW opens the track on a similar sound. */
const GM_PROGRAM: Record<TrackVoice, number> = { leadKeys: 81, guitar: 29, sax: 65, strings: 48, brass: 61, choir: 52 }
/** General MIDI percussion channel (10), and its notes for the kit. */
const CH_DRUMS = 9
const DRUM_NOTES: Record<DrumPart, number> = { kick: 36, snare: 38, hat: 42 }
const CLICK_ACCENT = 76 // hi wood block
const CLICK_BEAT = 77 // low wood block

export function parseTimeSignature(value: string | undefined): { beats: number; unit: number } {
  const match = /^(\d+)\s*\/\s*(\d+)$/.exec(value ?? '')
  const beats = match ? Number(match[1]) : 4
  const unit = match ? Number(match[2]) : 4
  return { beats: beats >= 1 && beats <= 32 ? beats : 4, unit: [1, 2, 4, 8, 16, 32].includes(unit) ? unit : 4 }
}

/** True when the song has anything to put in a MIDI file. */
export function songHasMidiContent(song: Song): boolean {
  return (
    !!song.midiTake?.notes.length ||
    (song.lyrics ?? '').trim().length > 0 ||
    TRACK_ROLES.some((role) => songHasTrack(song, role))
  )
}

/** True when the song has that track written (and not silenced). */
export function songHasTrack(song: Song, role: TrackRole): boolean {
  return trackHasNotes(song.band?.[role]) && !song.band![role]!.muted
}

/** True when the song has drums of its own to export: a pattern written for it, or a live take. */
export function songHasDrumPattern(song: Song): boolean {
  return (
    activeTakeNotes(song.band?.takes?.drums).length > 0 ||
    (!!song.band?.drums && DRUM_PARTS.some((part) => patternHasHits(song.band!.drums![part])))
  )
}

/** MIDI velocity of a hit: `base` for a normal one, harder for an accent, softer for a soft one. */
function hitVelocity(velocity: number, base: number): number {
  return Math.max(1, Math.min(127, Math.round((base * velocity) / 0.7)))
}

export function songsToMidi(songs: Song[], options: SongMidiOptions = DEFAULT_SONG_MIDI_OPTIONS): Uint8Array {
  const conductor: SmfEvent[] = []
  const chords: SmfEvent[] = []
  const bass: SmfEvent[] = []
  const drums: SmfEvent[] = []
  const melody: SmfEvent[] = []
  const written: Record<TrackRole, SmfEvent[]> = { lead: [], arrangement: [] }
  const click: SmfEvent[] = []

  let offsetBeats = 0
  for (const song of songs) {
    const bpm = song.bpm > 0 ? song.bpm : 120
    const { beats: beatsPerBar, unit } = parseTimeSignature(song.timeSignature)
    const timeline = createSongTimeline(song.lyrics ?? '', bpm, `${beatsPerBar}/${unit}`, {
      defaultBarsPerLine: 2,
      defaultBeatsPerChord: 4,
      intelligentEstimation: false,
    })
    const base = Math.round(offsetBeats * PPQ)
    conductor.push(markerEvent(base, song.title || 'Sin título'), tempoEvent(base, bpm), timeSignatureEvent(base, beatsPerBar, unit))

    let songBeats = timeline.totalBeats
    const songChords = chordEvents(timeline)
    // A role with a live take plays the take, exactly as played.
    const takeEvents = (notes: readonly TrackNote[], channel: number): SmfEvent[] =>
      notes.flatMap((note) =>
        noteEvents(base + Math.round(note.beat * PPQ), Math.max(1, Math.round(note.beats * PPQ)), channel, note.pitch, note.velocity * 127),
      )
    const keysTake = activeTakeNotes(song.band?.takes?.keys)
    const bassTake = activeTakeNotes(song.band?.takes?.bass)
    const drumsTake = activeTakeNotes(song.band?.takes?.drums)
    songBeats = Math.max(songBeats, trackEndBeat(keysTake), trackEndBeat(bassTake), trackEndBeat(drumsTake))
    // Otherwise each part with the rhythm written for the song (one long note per chord without one).
    if (options.chords && keysTake.length > 0) chords.push(...takeEvents(keysTake, CH_CHORDS))
    else if (options.chords) {
      for (const hit of rhythmHits(songChords, song.band?.chordRhythm, beatsPerBar)) {
        const voicing = voiceChord(hit.chord)
        if (!voicing) continue
        const tick = base + Math.round(hit.startBeat * PPQ)
        const length = Math.max(1, Math.round(hit.durationBeats * PPQ * 0.95))
        for (const pitch of voicing.chord) chords.push(...noteEvents(tick, length, CH_CHORDS, pitch, hitVelocity(hit.velocity, 85)))
      }
    }
    if (options.bass && bassTake.length > 0) bass.push(...takeEvents(bassTake, CH_BASS))
    else if (options.bass) {
      for (const hit of rhythmHits(songChords, song.band?.bassRhythm, beatsPerBar)) {
        const voicing = voiceChord(hit.chord)
        if (!voicing) continue
        const tick = base + Math.round(hit.startBeat * PPQ)
        const length = Math.max(1, Math.round(hit.durationBeats * PPQ * 0.95))
        bass.push(...noteEvents(tick, length, CH_BASS, bassInstrumentPitch(voicing), hitVelocity(hit.velocity, 95)))
      }
    }

    // Written tracks: in beats, so they sit on the song's own tempo.
    for (const role of TRACK_ROLES) {
      if (!options[role] || !songHasTrack(song, role)) continue
      const track = song.band![role]!
      written[role].push(programEvent(base, CH_TRACK[role], GM_PROGRAM[track.voice]))
      for (const note of track.notes) {
        const tick = base + Math.round(note.beat * PPQ)
        const length = Math.max(1, Math.round(note.beats * PPQ))
        written[role].push(...noteEvents(tick, length, CH_TRACK[role], note.pitch, note.velocity * 127))
      }
      songBeats = Math.max(songBeats, trackEndBeat(track.notes))
    }

    const take = song.midiTake
    if (options.melody && take && take.notes.length > 0) {
      const secondsPerBeat = 60 / Math.max(1, take.bpm)
      for (const note of take.notes) {
        const tick = base + Math.round((note.startTimeSeconds / secondsPerBeat) * PPQ)
        const length = Math.round((note.durationSeconds / secondsPerBeat) * PPQ)
        melody.push(...noteEvents(tick, length, CH_MELODY, note.pitchMidi, note.amplitude * 127))
      }
      songBeats = Math.max(songBeats, take.durationSeconds / secondsPerBeat)
    }

    // Round up to whole bars, plus one empty bar between songs.
    songBeats = Math.max(beatsPerBar, Math.ceil(songBeats / beatsPerBar - 1e-6) * beatsPerBar)
    if (options.drums && drumsTake.length > 0) {
      for (const hit of drumTakeHits(drumsTake)) {
        drums.push(...noteEvents(base + Math.round(hit.beat * PPQ), PPQ / 8, CH_DRUMS, DRUM_NOTES[hit.part], hit.velocity * 110))
      }
    } else if (options.drums && songHasDrumPattern(song)) {
      const pattern = cleanDrumPattern(song.band!.drums)
      const stepTicks = PPQ / STEPS_PER_BEAT
      const totalSteps = (songBeats / beatsPerBar) * stepsPerBar(beatsPerBar)
      for (const part of DRUM_PARTS) {
        const lane = patternVelocities(pattern[part])
        for (let step = 0; step < totalSteps; step++) {
          const velocity = laneVelocity(lane, step, beatsPerBar)
          if (velocity > 0) drums.push(...noteEvents(base + step * stepTicks, stepTicks / 2, CH_DRUMS, DRUM_NOTES[part], velocity * 110))
        }
      }
    }
    if (options.click) {
      for (let beat = 0; beat < songBeats; beat++) {
        const accent = beat % beatsPerBar === 0
        click.push(...noteEvents(base + beat * PPQ, PPQ / 8, CH_CLICK, accent ? CLICK_ACCENT : CLICK_BEAT, accent ? 110 : 80))
      }
    }
    offsetBeats += songBeats + beatsPerBar
  }

  const tracks: SmfTrack[] = [{ name: 'GigSync', events: conductor }]
  if (options.chords) tracks.push({ name: 'Acordes', events: chords })
  if (options.bass) tracks.push({ name: 'Bajo', events: bass })
  if (options.drums && drums.length > 0) tracks.push({ name: 'Batería', events: drums })
  for (const role of TRACK_ROLES) {
    if (written[role].length > 0) tracks.push({ name: TRACK_ROLE_LABELS[role], events: written[role] })
  }
  if (options.melody && melody.length > 0) tracks.push({ name: 'Teclado (toma)', events: melody })
  if (options.click) tracks.push({ name: 'Click', events: click })
  return writeSmf(tracks)
}
