/**
 * useMIDITransportSync Hook
 *
 * Drives the shared Tone.Transport from a DAW's MIDI Clock (useMIDIClockSync):
 *
 * - Start/Continue start the Transport right inside the MIDI handler, at the
 *   audio time the message was heard (output latency included) plus the
 *   user's offset — not after a React render and Tone's lookAhead, which put
 *   GigSync audibly behind the DAW. Since the message is handled after that
 *   instant, the Transport starts "now" with the elapsed time as offset.
 * - While the DAW plays, a phase lock compares the Transport position with
 *   the clock once per quarter note and nudges the tempo to close any gap, so
 *   a long song doesn't drift.
 * - The tempo is owned here while the clock runs; useBPMSync must not write
 *   it (useSmartAutoScroll passes `externalTempo` for that).
 *
 * The caller's callbacks run first (reset the transport, flip the player to
 * playing). useBPMSync's later Transport.start() is then a no-op: Tone ignores
 * start() while the Transport is already started.
 */

import { useRef } from 'react'
import * as Tone from 'tone'
import { useMIDIClockSync, type UseMIDIClockSyncReturn } from './useMIDIClockSync'
import { createAudioTimeMapper, type AudioClockLike } from '~/lib/midi/audioTime'
import { correctTempo, createPhaseLock } from '~/lib/midi/phaseLock'

/**
 * The native AudioContext behind Tone's. Tone wraps it with
 * standardized-audio-context, whose AudioContext hides getOutputTimestamp and
 * outputLatency (only baseLatency) — without them the browser's output latency
 * (~40 ms on Windows) isn't compensated. Same clock, so currentTime matches.
 */
function audioClock(): AudioClockLike {
  const raw = Tone.getContext().rawContext as unknown as AudioClockLike & {
    _nativeAudioContext?: AudioClockLike
  }
  return raw._nativeAudioContext ?? raw
}

export interface UseMIDITransportSyncOptions {
  enabled: boolean
  inputName?: string | null
  /** Positive = GigSync plays earlier (use it when its click sounds after the DAW's). */
  offsetMs?: number
  /** DAW Start: reset to the top and start playing (Transport is started right after). */
  onStart?: () => void
  /** DAW Continue: resume playing from the current position. */
  onContinue?: () => void
  onStop?: () => void
}

export function useMIDITransportSync({
  enabled,
  inputName,
  offsetMs = 0,
  onStart,
  onContinue,
  onStop,
}: UseMIDITransportSyncOptions): UseMIDIClockSyncReturn {
  const lockRef = useRef(createPhaseLock())
  const dawBpmRef = useRef<number | null>(null)
  // Read from MIDI handlers, outside React's render cycle.
  const optionsRef = useRef({ offsetMs, onStart, onContinue, onStop })
  optionsRef.current = { offsetMs, onStart, onContinue, onStop }

  const mapperRef = useRef(createAudioTimeMapper())

  /** Audio time at which the DAW event should be heard in GigSync. */
  const anchorTime = (timestampMs: number): number =>
    mapperRef.current(timestampMs, audioClock()) - optionsRef.current.offsetMs / 1000

  /** Start the Transport so that `fromTicks` lines up with the DAW event. */
  const startTransportAt = (timestampMs: number, fromTicks: number) => {
    const transport = Tone.getTransport()
    if (Tone.getContext().state !== 'running') {
      // First Start after loading the page: the browser lets audio resume
      // after any earlier click on it. The anchor still holds, so start late
      // but aligned (unless the player already started it meanwhile).
      void Tone.start()
        .then(() => {
          if (Tone.getContext().state === 'running' && transport.state !== 'started') {
            startTransportAt(timestampMs, fromTicks)
          }
        })
        .catch(() => undefined)
      return
    }
    if (dawBpmRef.current !== null) transport.bpm.value = dawBpmRef.current
    const anchor = anchorTime(timestampMs)
    // Never schedule before Tone.now(): the clock has already processed up to there.
    const startAt = Math.max(anchor, Tone.now())
    const elapsedTicks = ((startAt - anchor) * transport.bpm.value * transport.PPQ) / 60
    transport.start(startAt, `${Math.round(fromTicks + elapsedTicks)}i`)
    lockRef.current.start(fromTicks / transport.PPQ)
  }

  return useMIDIClockSync({
    enabled,
    inputName,
    onStart: (timestampMs) => {
      optionsRef.current.onStart?.()
      startTransportAt(timestampMs, 0)
    },
    onContinue: (timestampMs) => {
      optionsRef.current.onContinue?.()
      const transport = Tone.getTransport()
      if (transport.state !== 'started') startTransportAt(timestampMs, transport.ticks)
    },
    onStop: () => {
      lockRef.current.stop()
      // Leave the DAW tempo without the last phase correction for manual play.
      if (dawBpmRef.current !== null) Tone.getTransport().bpm.value = dawBpmRef.current
      optionsRef.current.onStop?.()
    },
    onClock: (timestampMs, bpm) => {
      if (bpm === null) return
      dawBpmRef.current = bpm
      const transport = Tone.getTransport()
      const lock = lockRef.current
      if (!lock.isLocked()) {
        if (Math.abs(transport.bpm.value - bpm) > 1e-3) transport.bpm.value = bpm
        return
      }
      const expectedQuarter = lock.tick()
      if (expectedQuarter === null || transport.state !== 'started') return
      const actualQuarter = transport.getTicksAtTime(anchorTime(timestampMs)) / transport.PPQ
      transport.bpm.value = correctTempo(bpm, actualQuarter - expectedQuarter)
    },
  })
}
