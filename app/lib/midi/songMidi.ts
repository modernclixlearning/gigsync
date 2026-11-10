/**
 * Songs → a Standard MIDI File (pure): a tempo/marker track, the chords and the
 * bass voiced like the player's band, the keyboard take (if one was saved) and,
 * optionally, a click. Several songs go one after another, a bar apart, each
 * with its own tempo, time signature and marker — drag the file into Ableton
 * and the arrangement follows.
 */

import { bassInstrumentPitch, voiceChord } from '~/lib/audio/chordVoicing'
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
  melody: boolean
  click: boolean
}

export const DEFAULT_SONG_MIDI_OPTIONS: SongMidiOptions = { chords: true, bass: true, melody: true, click: false }

const CH_CHORDS = 0
const CH_BASS = 1
const CH_MELODY = 2
const CH_CLICK = 9
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

export function songsToMidi(songs: Song[], options: SongMidiOptions = DEFAULT_SONG_MIDI_OPTIONS): Uint8Array {
  const conductor: SmfEvent[] = []
  const chords: SmfEvent[] = []
  const bass: SmfEvent[] = []
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
    for (const event of chordEvents(timeline)) {
      const voicing = voiceChord(event.chord)
      if (!voicing) continue
      const tick = base + Math.round(event.startBeat * PPQ)
      const length = Math.round(event.durationBeats * PPQ * 0.95)
      if (options.chords) for (const pitch of voicing.chord) chords.push(...noteEvents(tick, length, CH_CHORDS, pitch, 85))
      if (options.bass) bass.push(...noteEvents(tick, length, CH_BASS, bassInstrumentPitch(voicing), 95))
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
  if (options.melody && melody.length > 0) tracks.push({ name: 'Teclado (toma)', events: melody })
  if (options.click) tracks.push({ name: 'Click', events: click })
  return writeSmf(tracks)
}
