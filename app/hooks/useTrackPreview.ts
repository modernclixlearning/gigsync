/**
 * useTrackPreview Hook
 *
 * Plays notes on the audio clock, outside the player's Transport: what the
 * track editor uses to listen to a track over the song's chords, and to keep
 * those chords under you while you record. Notes are handed to the
 * instruments a moment before they sound (a short look-ahead), so Stop only
 * has to stop feeding them.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import type { PlayableVoice } from '~/lib/audio/instruments'

const LEAD_SECONDS = 0.1
const SCHEDULE_AHEAD_SECONDS = 0.15
const SCHEDULER_INTERVAL_MS = 25

/** One thing to play: a note or a chord, in beats from the start of the song. */
export interface PreviewNote {
  beat: number
  beats: number
  pitches: number[]
  /** 0–1 */
  velocity: number
}

export interface PreviewLayer {
  instrument: PlayableVoice
  notes: readonly PreviewNote[]
}

export interface PreviewOptions {
  bpm: number
  /** Beat of the song the playback starts on. */
  fromBeat: number
  /** Beat it stops on by itself; unset = runs until `stop()`. */
  toBeat?: number
  /** Audio-clock time at which `fromBeat` sounds (e.g. a recording's first downbeat). Default: right now. */
  origin?: number
  layers: PreviewLayer[]
}

export interface UseTrackPreviewReturn {
  playing: boolean
  start: (options: PreviewOptions) => Promise<void>
  stop: () => void
  /** Beat of the song being heard right now, or null when stopped. */
  position: () => number | null
}

interface Scheduled {
  /** Seconds after the origin. */
  time: number
  seconds: number
  frequencies: number[]
  velocity: number
  instrument: PlayableVoice
}

interface Session {
  origin: number
  fromBeat: number
  beatSeconds: number
  events: Scheduled[]
  next: number
  instruments: PlayableVoice[]
  scheduler: ReturnType<typeof setInterval>
  endTimer: ReturnType<typeof setTimeout> | null
}

/** Output latency of the native context (Tone's wrapper hides it); 0 when unknown. */
function outputLatency(): number {
  const raw = Tone.getContext().rawContext as unknown as {
    outputLatency?: number
    _nativeAudioContext?: { outputLatency?: number }
  }
  const latency = raw._nativeAudioContext?.outputLatency ?? raw.outputLatency
  return typeof latency === 'number' && Number.isFinite(latency) ? latency : 0
}

/** The layers as one list of events in seconds from `fromBeat`, in time order (pure). */
export function previewEvents(layers: PreviewLayer[], bpm: number, fromBeat: number, toBeat = Infinity): Scheduled[] {
  const beatSeconds = 60 / Math.max(1, bpm)
  const events: Scheduled[] = []
  for (const layer of layers) {
    for (const note of layer.notes) {
      // A note already sounding at the start is left out: it would come in late.
      if (note.beat < fromBeat - 1e-6 || note.beat >= toBeat || note.pitches.length === 0) continue
      events.push({
        time: (note.beat - fromBeat) * beatSeconds,
        seconds: Math.max(0.05, Math.min(note.beats, toBeat - note.beat) * beatSeconds),
        frequencies: note.pitches.map((pitch) => Tone.Frequency(pitch, 'midi').toFrequency()),
        velocity: note.velocity,
        instrument: layer.instrument,
      })
    }
  }
  return events.sort((a, b) => a.time - b.time)
}

export function useTrackPreview(): UseTrackPreviewReturn {
  const [playing, setPlaying] = useState(false)
  const sessionRef = useRef<Session | null>(null)

  const stop = useCallback(() => {
    const session = sessionRef.current
    if (!session) return
    sessionRef.current = null
    clearInterval(session.scheduler)
    if (session.endTimer) clearTimeout(session.endTimer)
    session.instruments.forEach((instrument) => instrument.releaseAll())
    // Notes already handed over for the next instant: silence them once they have started.
    setTimeout(
      () => {
        if (!sessionRef.current) session.instruments.forEach((instrument) => instrument.releaseAll())
      },
      SCHEDULE_AHEAD_SECONDS * 1000 + 60,
    )
    setPlaying(false)
  }, [])

  const start = useCallback(
    async ({ bpm, fromBeat, toBeat, origin, layers }: PreviewOptions) => {
      stop()
      if (Tone.getContext().state !== 'running') await Tone.start()
      const beatSeconds = 60 / Math.max(1, bpm)
      const session: Session = {
        origin: origin ?? Tone.now() + LEAD_SECONDS,
        fromBeat,
        beatSeconds,
        events: previewEvents(layers, bpm, fromBeat, toBeat),
        next: 0,
        instruments: [...new Set(layers.map((layer) => layer.instrument))],
        scheduler: 0 as unknown as ReturnType<typeof setInterval>,
        endTimer: null,
      }
      const schedule = () => {
        const now = Tone.getContext().currentTime
        while (session.next < session.events.length) {
          const event = session.events[session.next]
          const at = session.origin + event.time
          if (at > now + SCHEDULE_AHEAD_SECONDS) break
          session.next += 1
          event.instrument.triggerAttackRelease(event.frequencies, event.seconds, Math.max(at, now), event.velocity)
        }
      }
      sessionRef.current = session
      schedule()
      session.scheduler = setInterval(schedule, SCHEDULER_INTERVAL_MS)
      if (toBeat !== undefined && Number.isFinite(toBeat)) {
        const endsIn = session.origin + (toBeat - fromBeat) * beatSeconds - Tone.getContext().currentTime
        session.endTimer = setTimeout(
          () => {
            if (sessionRef.current === session) stop()
          },
          Math.max(0, endsIn + 0.4) * 1000,
        )
      }
      setPlaying(true)
    },
    [stop],
  )

  const position = useCallback((): number | null => {
    const session = sessionRef.current
    if (!session) return null
    return session.fromBeat + (Tone.getContext().currentTime - outputLatency() - session.origin) / session.beatSeconds
  }, [])

  useEffect(() => stop, [stop])

  return { playing, start, stop, position }
}
