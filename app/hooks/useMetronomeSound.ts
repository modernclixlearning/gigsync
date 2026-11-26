/**
 * useMetronomeSound Hook
 * Metronome click for the song player, scheduled on the shared Tone.Transport
 * (the one useBPMSync runs and the autoscroll follows).
 *
 * Each click is scheduled at its exact audio time from a Transport loop, like
 * useMetronome and useCountIn do. It must not be triggered from React state
 * (beat changes go through Tone.Draw + a render), or the click lands whenever
 * the main thread gets there: audibly uneven and ~lookAhead late.
 */

import { useEffect, useRef } from 'react'
import * as Tone from 'tone'
import { ACCENT_VELOCITY, beatAccent, meterOf } from '~/lib/metronome/beatAccent'

export type MetronomeSoundType = 'classic' | 'woodblock' | 'sticks' | 'electronic' | 'silent'

export interface UseMetronomeSoundOptions {
  enabled: boolean
  isPlaying: boolean
  sound?: MetronomeSoundType
  volume?: number
  accentFirst?: boolean
  /** The song's meter ("6/8"): 6/8, 9/8 and 12/8 also accent each group of three. */
  timeSignature?: string
  /** Beats the bar lines are moved by an incomplete first bar (see lib/timeline/anacrusis). Default 0. */
  barOffsetBeats?: number
}

const SOUNDS: Record<MetronomeSoundType, { accent: number; normal: number }> = {
  classic: { accent: 1200, normal: 800 },
  woodblock: { accent: 400, normal: 300 },
  sticks: { accent: 2000, normal: 1500 },
  electronic: { accent: 600, normal: 400 },
  silent: { accent: 0, normal: 0 },
}

/**
 * Whether a click at `ticks` falls on the first beat of a bar.
 * `quartersPerBar` is Tone's own measure length (e.g. 4 for 4/4, 3 for 6/8).
 */
export function isDownbeat(ticks: number, ppq: number, quartersPerBar: number, offsetQuarters = 0): boolean {
  const ticksPerBar = Math.round(Math.max(1, quartersPerBar) * ppq)
  // An anacrusis moves the bar lines: the song's first beats are the last of a bar.
  const tickInBar = ((Math.round(ticks + offsetQuarters * ppq) % ticksPerBar) + ticksPerBar) % ticksPerBar
  return tickInBar < ppq / 2 || ticksPerBar - tickInBar < ppq / 2
}

/**
 * The 0-based beat within its bar of the click at `ticks`, in whole quarters
 * (each one a beat of the song). `offsetQuarters` moves the bar lines for an
 * incomplete first bar. Tolerates tick rounding around a beat line.
 */
export function beatInBarAt(ticks: number, ppq: number, quartersPerBar: number, offsetQuarters = 0): number {
  const perBar = Math.max(1, Math.round(quartersPerBar))
  const beat = Math.round(ticks / ppq + offsetQuarters)
  return ((beat % perBar) + perBar) % perBar
}

export function useMetronomeSound({
  enabled,
  isPlaying,
  sound = 'classic',
  volume = 0.6,
  accentFirst = true,
  timeSignature = '4/4',
  barOffsetBeats = 0,
}: UseMetronomeSoundOptions): void {
  const synthRef = useRef<Tone.Synth | null>(null)
  // Read from the audio callback, outside React's render cycle.
  const optionsRef = useRef({ isPlaying, sound, accentFirst, timeSignature, barOffsetBeats })
  optionsRef.current = { isPlaying, sound, accentFirst, timeSignature, barOffsetBeats }

  // Synth + a quarter-note loop on the Transport. The loop only fires while the
  // Transport runs, so play/pause/seek/tempo changes are followed for free.
  useEffect(() => {
    if (!enabled) return

    let loop: Tone.Loop | null = null
    try {
      const synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.001,
          decay: 0.1,
          sustain: 0,
          release: 0.1,
        },
      }).toDestination()
      synthRef.current = synth

      loop = new Tone.Loop((time: number) => {
        const {
          isPlaying: playing,
          sound: currentSound,
          accentFirst: accent,
          timeSignature: meter,
          barOffsetBeats: offset,
        } = optionsRef.current
        if (!playing) return
        const frequencies = SOUNDS[currentSound]
        if (frequencies.normal <= 0) return

        const transport = Tone.getTransport()
        const ticks = transport.getTicksAtTime(time)
        const quartersPerBar = Number(transport.timeSignature)
        const { beats, unit } = meterOf(meter)
        // The bar line comes from Tone's measure (isDownbeat); the groups of a
        // compound meter from the beat's place in that bar.
        const kind = !accent
          ? 'normal'
          : isDownbeat(ticks, transport.PPQ, quartersPerBar, offset)
            ? 'strong'
            : beatAccent(beatInBarAt(ticks, transport.PPQ, quartersPerBar, offset), beats, unit)
        synth.triggerAttackRelease(
          kind === 'normal' ? frequencies.normal : frequencies.accent,
          '32n',
          time,
          ACCENT_VELOCITY[kind],
        )
      }, '4n')
      loop.start(0)
    } catch (error) {
      console.error('Failed to initialize metronome sound:', error)
    }

    return () => {
      loop?.dispose()
      synthRef.current?.dispose()
      synthRef.current = null
    }
  }, [enabled])

  // Update volume
  useEffect(() => {
    if (synthRef.current && enabled) {
      synthRef.current.volume.value = Tone.gainToDb(Math.max(0.0001, volume))
    }
  }, [volume, enabled])
}
