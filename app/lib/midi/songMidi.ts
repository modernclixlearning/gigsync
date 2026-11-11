/**
 * Songs → a Standard MIDI File (pure): a tempo/marker track, the chords and the
 * bass voiced like the player's band and played with the rhythm written for
 * the song, its drum pattern (if it has one), the keyboard take (if one was
 * saved) and, optionally, a click. Several songs go one after another, a bar apart, each
 * with its own tempo, time signature and marker — drag the file into Ableton
 * and the arrangement follows.
 */

import { bassInstrumentPitch, voiceChord } from '~/lib/audio/chordVoicing'
import { DRUM_PARTS, cleanDrumPattern, patternHasHits, patternVelocities, rhythmHits, stepsPerBar } from '~/lib/audio/bandPatterns'
import { STEPS_PER_BEAT, laneVelocity, type DrumPart } from '~/lib/audio/bandSound'
import { chordEvents } from '~/lib/timeline/chordEvents'
import { createSongTimeline } from '~/lib/timeline/calculator'
import type { Song } from '~/types/setlist'
import {
  PPQ,
  markerEvent,
  noteEvents,
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
  melody: boolean
  click: boolean
}

export const DEFAULT_SONG_MIDI_OPTIONS: SongMidiOptions = { chords: true, bass: true, drums: true, melody: true, click: false }

const CH_CHORDS = 0
const CH_BASS = 1
const CH_MELODY = 2
const CH_CLICK = 9
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
  return !!song.midiTake?.notes.length || (song.lyrics ?? '').trim().length > 0
}

/** True when the song has a drum pattern of its own to export. */
export function songHasDrumPattern(song: Song): boolean {
  return !!song.band?.drums && DRUM_PARTS.some((part) => patternHasHits(song.band!.drums![part]))
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
    // Each part with the rhythm written for the song (one long note per chord without one).
    if (options.chords) {
      for (const hit of rhythmHits(songChords, song.band?.chordRhythm, beatsPerBar)) {
        const voicing = voiceChord(hit.chord)
        if (!voicing) continue
        const tick = base + Math.round(hit.startBeat * PPQ)
        const length = Math.max(1, Math.round(hit.durationBeats * PPQ * 0.95))
        for (const pitch of voicing.chord) chords.push(...noteEvents(tick, length, CH_CHORDS, pitch, hitVelocity(hit.velocity, 85)))
      }
    }
    if (options.bass) {
      for (const hit of rhythmHits(songChords, song.band?.bassRhythm, beatsPerBar)) {
        const voicing = voiceChord(hit.chord)
        if (!voicing) continue
        const tick = base + Math.round(hit.startBeat * PPQ)
        const length = Math.max(1, Math.round(hit.durationBeats * PPQ * 0.95))
        bass.push(...noteEvents(tick, length, CH_BASS, bassInstrumentPitch(voicing), hitVelocity(hit.velocity, 95)))
      }
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
    if (options.drums && songHasDrumPattern(song)) {
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
  if (options.melody && melody.length > 0) tracks.push({ name: 'Teclado (toma)', events: melody })
  if (options.click) tracks.push({ name: 'Click', events: click })
  return writeSmf(tracks)
}
