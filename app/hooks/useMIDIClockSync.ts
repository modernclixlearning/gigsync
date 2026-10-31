/**
 * useMIDIClockSync Hook
 *
 * Listens to MIDI Clock (0xF8) + Start/Continue/Stop (0xFA/0xFB/0xFC) from a
 * Web MIDI input (e.g. a loopMIDI port fed by REAPER / Ableton Live) and
 * exposes the DAW tempo + transport events (with each event's timestamp). It
 * does NOT touch Tone: useMIDITransportSync drives the one Tone.Transport from
 * these callbacks, so autoscroll and the metronome keep following it.
 *
 * Opt-in: when `enabled` is false nothing is requested (no permission prompt).
 * Unsupported browser / denied permission / missing port are reported through
 * `status` + `message`; the caller simply keeps its internal BPM.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMIDIAccess, type MIDIInputInfo } from './useMIDIAccess'
import {
  createClockBpmEstimator,
  getMIDIClockStatusMessage,
  parseMIDIRealtimeMessage,
  type MIDIClockSyncStatus,
} from '~/lib/midi/clock'

export type { MIDIInputInfo }

export interface UseMIDIClockSyncOptions {
  /** Opt-in switch. False → no Web MIDI access is requested. */
  enabled: boolean
  /** Name of the MIDI input to follow. Null/undefined → first available input. */
  inputName?: string | null
  /** DAW sent Start (0xFA): play from the beginning. `timestampMs` is the event's performance.now() time. */
  onStart?: (timestampMs: number) => void
  /** DAW sent Continue (0xFB): resume from the current position. */
  onContinue?: (timestampMs: number) => void
  /** DAW sent Stop (0xFC). */
  onStop?: (timestampMs: number) => void
  /** Every Timing Clock tick (0xF8), with the current tempo estimate (null until known). */
  onClock?: (timestampMs: number, bpm: number | null) => void
}

export interface UseMIDIClockSyncReturn {
  status: MIDIClockSyncStatus
  /** Connected MIDI inputs (empty until access is granted). */
  inputs: MIDIInputInfo[]
  /** Name of the input currently being listened to, if any. */
  activeInputName: string | null
  /** Tempo derived from the incoming clock, or null when no clock has been received yet. */
  bpm: number | null
  /** Non-blocking user-facing message (Spanish) for unsupported/denied/no-port states. */
  message: string | null
}

export function useMIDIClockSync({
  enabled,
  inputName,
  onStart,
  onContinue,
  onStop,
  onClock,
}: UseMIDIClockSyncOptions): UseMIDIClockSyncReturn {
  const { access, accessStatus, inputs } = useMIDIAccess(enabled)
  const [bpm, setBpm] = useState<number | null>(null)

  const estimatorRef = useRef(createClockBpmEstimator())
  const callbacksRef = useRef({ onStart, onContinue, onStop, onClock })
  useEffect(() => {
    callbacksRef.current = { onStart, onContinue, onStop, onClock }
  })

  const selectedInput: MIDIInputInfo | null = inputName
    ? inputs.find((input) => input.name === inputName) ?? null
    : inputs[0] ?? null
  const selectedInputId = selectedInput?.id ?? null

  const handleMessage = useCallback((event: Event) => {
    const midiEvent = event as MIDIMessageEvent
    const kind = parseMIDIRealtimeMessage(midiEvent.data)
    if (!kind) return
    const timestamp = midiEvent.timeStamp || performance.now()
    if (kind === 'clock') {
      const next = estimatorRef.current.tick(timestamp)
      if (next !== null) setBpm(next)
      callbacksRef.current.onClock?.(timestamp, estimatorRef.current.getBpm())
      return
    }
    if (kind === 'start') callbacksRef.current.onStart?.(timestamp)
    else if (kind === 'continue') callbacksRef.current.onContinue?.(timestamp)
    else if (kind === 'stop') callbacksRef.current.onStop?.(timestamp)
  }, [])

  // Attach to the selected input.
  useEffect(() => {
    if (!access || !selectedInputId) return
    const input = access.inputs.get(selectedInputId)
    if (!input) return

    estimatorRef.current = createClockBpmEstimator()
    setBpm(null)
    input.addEventListener('midimessage', handleMessage)
    // addEventListener (unlike the onmidimessage setter) doesn't implicitly open the port.
    void input.open?.().catch(() => undefined)

    return () => {
      input.removeEventListener('midimessage', handleMessage)
      estimatorRef.current.reset()
      setBpm(null)
    }
  }, [access, selectedInputId, handleMessage])

  let status: MIDIClockSyncStatus
  if (!enabled) status = 'disabled'
  else if (accessStatus === 'unsupported') status = 'unsupported'
  else if (accessStatus === 'denied') status = 'denied'
  else if (accessStatus !== 'granted') status = 'requesting'
  else if (inputs.length === 0) status = 'no-inputs'
  else if (!selectedInput) status = 'input-missing'
  else status = 'listening'

  return {
    status,
    inputs,
    activeInputName: status === 'listening' ? selectedInput?.name ?? null : null,
    bpm: status === 'listening' ? bpm : null,
    message: getMIDIClockStatusMessage(status, inputName),
  }
}
