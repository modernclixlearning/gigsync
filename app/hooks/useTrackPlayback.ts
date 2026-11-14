/**
 * useTrackPlayback Hook
 *
 * Plays one written track of the song (the lead melody or the arrangement)
 * while the player runs: every note is a Tone.Part event on the shared
 * Transport, placed in ticks — so, like the chords and the drums, it follows
 * play/pause, seek and tempo changes without any React timing.
 */

import { useEffect, useRef } from 'react'
import * as Tone from 'tone'
import type { TrackNote, TrackVoice } from '~/lib/audio/bandTracks'
import { createTrackInstrument, type PlayableVoice } from '~/lib/audio/instruments'

export interface UseTrackPlaybackOptions {
  enabled: boolean
  isPlaying: boolean
  voice: TrackVoice
  notes: readonly TrackNote[]
  /** 0..1 */
  volume?: number
}

interface ScheduledNote {
  pitch: number
  /** Length in Transport ticks. */
  ticks: number
  /** 0–1 */
  velocity: number
}

export function useTrackPlayback({ enabled, isPlaying, voice, notes, volume = 0.6 }: UseTrackPlaybackOptions): void {
  const synthRef = useRef<PlayableVoice | null>(null)
  const playingRef = useRef(isPlaying)
  playingRef.current = isPlaying
  const active = enabled && notes.length > 0

  // The instrument, alive while the track can sound (rebuilt when its voice changes).
  useEffect(() => {
    if (!active) return
    const instrument = createTrackInstrument(voice)
    synthRef.current = instrument.synth
    return () => {
      instrument.dispose()
      synthRef.current = null
    }
  }, [active, voice])

  useEffect(() => {
    if (synthRef.current) synthRef.current.volume.value = Tone.gainToDb(Math.max(0.0001, volume))
  }, [volume, active, voice])

  // One Part event per note, at its tick on the Transport.
  useEffect(() => {
    if (!active) return
    const ppq = Tone.getTransport().PPQ
    const part = new Tone.Part<{ time: string } & ScheduledNote>(
      (time, note) => {
        const synth = synthRef.current
        if (!synth || !playingRef.current) return
        synth.triggerAttackRelease(
          [Tone.Frequency(note.pitch, 'midi').toFrequency()],
          Tone.Ticks(note.ticks).toSeconds(),
          time,
          note.velocity,
        )
      },
      notes.map((note) => ({
        time: `${Math.round(note.beat * ppq)}i`,
        pitch: note.pitch,
        ticks: Math.max(1, Math.round(note.beats * ppq)),
        velocity: note.velocity,
      })),
    )
    part.start(0)
    return () => {
      part.dispose()
    }
  }, [active, notes])

  // Pause: whatever is sounding stops.
  useEffect(() => {
    if (active && !isPlaying) synthRef.current?.releaseAll()
  }, [active, isPlaying])
}
