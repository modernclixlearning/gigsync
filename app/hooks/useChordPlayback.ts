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
import { voiceChord } from '~/lib/audio/chordVoicing'
import { chordEventAt, type ChordEvent } from '~/lib/timeline/chordEvents'

export interface UseChordPlaybackOptions {
  enabled: boolean
  isPlaying: boolean
  /** Chords with their start and length in beats (quarter notes on the Transport). */
  events: ChordEvent[]
  /** 0..1 */
  volume?: number
}

interface ScheduledChord {
  pitches: number[]
  /** Length in Transport ticks. */
  ticks: number
}

/** Leave a hair of silence before the next chord, so repeated chords re-attack. */
const LEGATO = 0.92

function frequencies(pitches: number[]): number[] {
  return pitches.map((pitch) => Tone.Frequency(pitch, 'midi').toFrequency())
}

export function useChordPlayback({ enabled, isPlaying, events, volume = 0.5 }: UseChordPlaybackOptions): void {
  const synthRef = useRef<Tone.PolySynth | null>(null)
  const eventsRef = useRef(events)
  eventsRef.current = events
  const playingRef = useRef(isPlaying)
  playingRef.current = isPlaying

  // Synth, alive while chord sound is on.
  useEffect(() => {
    if (!enabled) return
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.4, sustain: 0.35, release: 0.5 },
    }).toDestination()
    synth.maxPolyphony = 24
    synthRef.current = synth
    return () => {
      synth.releaseAll()
      synth.dispose()
      synthRef.current = null
    }
  }, [enabled])

  useEffect(() => {
    if (synthRef.current) synthRef.current.volume.value = Tone.gainToDb(Math.max(0.0001, volume))
  }, [volume, enabled])

  // One Part event per chord, at its tick on the Transport.
  useEffect(() => {
    if (!enabled) return
    const transport = Tone.getTransport()
    const ppq = transport.PPQ
    const part = new Tone.Part<{ time: string } & ScheduledChord>(
      (time, chord) => {
        const synth = synthRef.current
        if (!synth || !playingRef.current) return
        synth.triggerAttackRelease(frequencies(chord.pitches), Tone.Ticks(chord.ticks * LEGATO).toSeconds(), time, 0.7)
      },
      events.flatMap((event) => {
        const voicing = voiceChord(event.chord)
        if (!voicing) return []
        return [
          {
            time: `${Math.round(event.startBeat * ppq)}i`,
            pitches: [voicing.bass, ...voicing.chord],
            ticks: Math.round(event.durationBeats * ppq),
          },
        ]
      }),
    )
    part.start(0)
    return () => {
      part.dispose()
    }
  }, [enabled, events])

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
    if (!current || Math.abs(current.startBeat * ppq - ticks) < 1) return
    const voicing = voiceChord(current.chord)
    if (!voicing) return
    const remaining = Math.round((current.startBeat + current.durationBeats) * ppq - ticks)
    const id = transport.scheduleOnce((time) => {
      if (!playingRef.current) return
      synthRef.current?.triggerAttackRelease(
        frequencies([voicing.bass, ...voicing.chord]),
        Tone.Ticks(Math.max(1, remaining) * LEGATO).toSeconds(),
        time,
        0.7,
      )
    }, `${ticks + 1}i`)
    return () => {
      transport.clear(id)
    }
  }, [enabled, isPlaying])
}
