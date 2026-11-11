/**
 * useChordPlayback Hook
 *
 * Plays the song's chords while the player runs: each chord (bass + close
 * voicing, simple synth) is a Tone.Part event on the shared Transport, placed
 * in ticks — so, like the metronome, it follows play/pause, seek and tempo
 * changes (including a DAW's MIDI Clock) without any React timing.
 *
 * Pressing Play in the middle of a chord sounds it right away for what's left
 * of it, instead of waiting for the next change.
 */

import { useEffect, useRef } from 'react'
import * as Tone from 'tone'
import { bassInstrumentPitch, voiceChord } from '~/lib/audio/chordVoicing'
import {
  DEFAULT_BASS_VOICE,
  DEFAULT_KEYS_VOICE,
  type BassVoice,
  type KeysVoice,
} from '~/lib/audio/bandSound'
import { patternHasHits, rhythmHits } from '~/lib/audio/bandPatterns'
import { createBassInstrument, createKeysInstrument, type PlayableVoice } from '~/lib/audio/instruments'
import { chordEventAt, type ChordEvent } from '~/lib/timeline/chordEvents'

export interface UseChordPlaybackOptions {
  enabled: boolean
  isPlaying: boolean
  /** Chords with their start and length in beats (quarter notes on the Transport). */
  events: ChordEvent[]
  /** 0..1 */
  volume?: number
  /**
   * Which band channel this is: the keyboard plays the chord (stereo), the
   * bass only the root note (mono). Default keyboard.
   */
  role?: 'keys' | 'bass'
  /** Sound of the channel (a KeysVoice for the keyboard, a BassVoice for the bass). */
  voice?: KeysVoice | BassVoice
  /** Keyboard only: also play the bass note under the chord (when there's no bass channel). Default true. */
  withBass?: boolean
  /** Rhythm written for the song (see bandPatterns). Unset or empty = one long note per chord. */
  rhythm?: string
  /** Beats in a bar — the rhythm restarts every bar. Default 4. */
  beatsPerBar?: number
}

interface ScheduledChord {
  pitches: number[]
  /** Length in Transport ticks. */
  ticks: number
  /** 0–1 */
  velocity: number
}

/** Leave a hair of silence before the next chord, so repeated chords re-attack. */
const LEGATO = 0.92

function frequencies(pitches: number[]): number[] {
  return pitches.map((pitch) => Tone.Frequency(pitch, 'midi').toFrequency())
}

function pitchesFor(voicing: { bass: number; chord: number[] }, role: 'keys' | 'bass', withBass: boolean): number[] {
  if (role === 'bass') return [bassInstrumentPitch(voicing)]
  return withBass ? [voicing.bass, ...voicing.chord] : voicing.chord
}

export function useChordPlayback({
  enabled,
  isPlaying,
  events,
  volume = 0.5,
  role = 'keys',
  voice,
  withBass = true,
  rhythm,
  beatsPerBar = 4,
}: UseChordPlaybackOptions): void {
  const synthRef = useRef<PlayableVoice | null>(null)
  const eventsRef = useRef(events)
  eventsRef.current = events
  const playingRef = useRef(isPlaying)
  playingRef.current = isPlaying
  const hasRhythmRef = useRef(false)
  hasRhythmRef.current = patternHasHits(rhythm)

  // Synth, alive while the channel is on (rebuilt when its sound changes).
  useEffect(() => {
    if (!enabled) return
    const instrument =
      role === 'bass'
        ? createBassInstrument((voice as BassVoice | undefined) ?? DEFAULT_BASS_VOICE)
        : createKeysInstrument((voice as KeysVoice | undefined) ?? DEFAULT_KEYS_VOICE)
    synthRef.current = instrument.synth
    return () => {
      instrument.dispose()
      synthRef.current = null
    }
  }, [enabled, role, voice])

  useEffect(() => {
    if (synthRef.current) synthRef.current.volume.value = Tone.gainToDb(Math.max(0.0001, volume))
  }, [volume, enabled, role, voice])

  // One Part event per hit (a chord, or each step of the song's rhythm), at its tick on the Transport.
  useEffect(() => {
    if (!enabled) return
    const transport = Tone.getTransport()
    const ppq = transport.PPQ
    const part = new Tone.Part<{ time: string } & ScheduledChord>(
      (time, chord) => {
        const synth = synthRef.current
        if (!synth || !playingRef.current) return
        synth.triggerAttackRelease(frequencies(chord.pitches), Tone.Ticks(chord.ticks * LEGATO).toSeconds(), time, chord.velocity)
      },
      rhythmHits(events, rhythm, beatsPerBar).flatMap((hit) => {
        const voicing = voiceChord(hit.chord)
        if (!voicing) return []
        return [
          {
            time: `${Math.round(hit.startBeat * ppq)}i`,
            pitches: pitchesFor(voicing, role, withBass),
            ticks: Math.max(1, Math.round(hit.durationBeats * ppq)),
            velocity: hit.velocity,
          },
        ]
      }),
    )
    part.start(0)
    return () => {
      part.dispose()
    }
  }, [enabled, events, role, withBass, rhythm, beatsPerBar])

  // Play/pause: on pause the chord stops; on play from the middle of a chord,
  // that chord sounds as soon as the Transport moves (after any count-in).
  useEffect(() => {
    if (!enabled) return
    const synth = synthRef.current
    if (!isPlaying) {
      synth?.releaseAll()
      return
    }
    const transport = Tone.getTransport()
    const ppq = transport.PPQ
    const ticks = transport.ticks
    const current = chordEventAt(eventsRef.current, ticks / ppq)
    // With a rhythm the next hit is at most a bar away: nothing to catch up with.
    if (hasRhythmRef.current) return
    if (!current || Math.abs(current.startBeat * ppq - ticks) < 1) return
    const voicing = voiceChord(current.chord)
    if (!voicing) return
    const remaining = Math.round((current.startBeat + current.durationBeats) * ppq - ticks)
    const id = transport.scheduleOnce((time) => {
      if (!playingRef.current) return
      synthRef.current?.triggerAttackRelease(
        frequencies(pitchesFor(voicing, role, withBass)),
        Tone.Ticks(Math.max(1, remaining) * LEGATO).toSeconds(),
        time,
        0.7,
      )
    }, `${ticks + 1}i`)
    return () => {
      transport.clear(id)
    }
  }, [enabled, isPlaying, role, withBass])
}
