/**
 * useTakePlayback Hook
 *
 * Plays a recorded MIDI take back through a simple synth, with the click it
 * was played against, and reports where in the take the listener is (for the
 * piano roll's playhead). Everything is scheduled up front on the audio clock;
 * stopping disposes the synths, which drops whatever is still pending.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import { beatSeconds, type RecordingGrid } from '~/lib/midi/recording'
import type { NoteEvent } from '~/lib/audioAnalysis/types'

const LEAD_SECONDS = 0.1
const ACCENT_HZ = 1200
const NORMAL_HZ = 800

export interface TakePlaybackOptions {
  grid: RecordingGrid
  durationSeconds: number
  /** Play the click too (default true). */
  click?: boolean
}

export interface UseTakePlaybackReturn {
  playing: boolean
  play: (notes: NoteEvent[], options: TakePlaybackOptions) => Promise<void>
  stop: () => void
  /** Seconds into the take being heard right now, or null when stopped. */
  position: () => number | null
  /** Play one short note (picking or drawing a note in the piano roll). */
  audition: (pitch: number) => void
}

interface Playback {
  origin: number
  synths: Tone.ToneAudioNode[]
  timer: ReturnType<typeof setTimeout>
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

export function useTakePlayback(): UseTakePlaybackReturn {
  const [playing, setPlaying] = useState(false)
  const playbackRef = useRef<Playback | null>(null)
  const auditionRef = useRef<Tone.PolySynth | null>(null)

  const stop = useCallback(() => {
    const playback = playbackRef.current
    if (!playback) return
    playbackRef.current = null
    clearTimeout(playback.timer)
    playback.synths.forEach((synth) => synth.dispose())
    setPlaying(false)
  }, [])

  const play = useCallback(
    async (notes: NoteEvent[], { grid, durationSeconds, click = true }: TakePlaybackOptions) => {
      stop()
      if (Tone.getContext().state !== 'running') await Tone.start()

      const origin = Tone.now() + LEAD_SECONDS
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.6 },
      }).toDestination()
      synth.maxPolyphony = 64
      synth.volume.value = -10
      for (const note of notes) {
        synth.triggerAttackRelease(
          Tone.Frequency(note.pitchMidi, 'midi').toFrequency(),
          Math.max(0.05, note.durationSeconds),
          origin + note.startTimeSeconds,
          note.amplitude,
        )
      }
      const synths: Tone.ToneAudioNode[] = [synth]

      const beat = beatSeconds(grid.bpm)
      const bpb = Math.max(1, Math.round(grid.beatsPerBar))
      const beats = Math.max(1, Math.ceil(durationSeconds / beat / bpb - 1e-6)) * bpb
      if (click) {
        const clickSynth = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
        }).toDestination()
        clickSynth.volume.value = -6
        for (let i = 0; i < beats; i++) {
          clickSynth.triggerAttackRelease(i % bpb === 0 ? ACCENT_HZ : NORMAL_HZ, '32n', origin + i * beat)
        }
        synths.push(clickSynth)
      }

      const end = Math.max(beats * beat, ...notes.map((n) => n.startTimeSeconds + n.durationSeconds))
      const timer = setTimeout(stop, (LEAD_SECONDS + end + 0.3) * 1000)
      playbackRef.current = { origin, synths, timer }
      setPlaying(true)
    },
    [stop],
  )

  const position = useCallback((): number | null => {
    const playback = playbackRef.current
    if (!playback) return null
    return Tone.getContext().currentTime - outputLatency() - playback.origin
  }, [])

  const audition = useCallback((pitch: number) => {
    if (Tone.getContext().state !== 'running') void Tone.start().catch(() => undefined)
    if (!auditionRef.current) {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.2, sustain: 0.3, release: 0.4 },
      }).toDestination()
      synth.volume.value = -10
      auditionRef.current = synth
    }
    auditionRef.current.triggerAttackRelease(Tone.Frequency(pitch, 'midi').toFrequency(), 0.25, Tone.immediate(), 0.7)
  }, [])

  useEffect(
    () => () => {
      stop()
      auditionRef.current?.dispose()
      auditionRef.current = null
    },
    [stop],
  )

  return { playing, play, stop, position, audition }
}
