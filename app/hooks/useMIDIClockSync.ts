/**
 * useMIDIClockSync Hook
 *
 * Listens to MIDI Clock (0xF8) + Start/Continue/Stop (0xFA/0xFB/0xFC) from a
 * Web MIDI input (e.g. a loopMIDI port fed by REAPER / Ableton Live) and
 * exposes the DAW tempo + transport events. It does NOT own a clock: the caller
 * feeds `bpm` into the existing Tone.Transport (useBPMSync) and maps the
 * transport callbacks onto the player's play/pause, so autoscroll and the
 * metronome keep following that single transport.
 *
 * Opt-in: when `enabled` is false nothing is requested (no permission prompt).
 * Unsupported browser / denied permission / missing port are reported through
 * `status` + `message`; the caller simply keeps its internal BPM.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createClockBpmEstimator,
  getMIDIClockStatusMessage,
  parseMIDIRealtimeMessage,
  type MIDIClockSyncStatus,
} from '~/lib/midi/clock'

export interface MIDIInputInfo {
  id: string
  name: string
}

export interface UseMIDIClockSyncOptions {
  /** Opt-in switch. False → no Web MIDI access is requested. */
  enabled: boolean
  /** Name of the MIDI input to follow. Null/undefined → first available input. */
  inputName?: string | null
  /** DAW sent Start (0xFA): play from the beginning. */
  onStart?: () => void
  /** DAW sent Continue (0xFB): resume from the current position. */
  onContinue?: () => void
  /** DAW sent Stop (0xFC). */
  onStop?: () => void
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

function listInputs(access: MIDIAccess): MIDIInputInfo[] {
  const result: MIDIInputInfo[] = []
  access.inputs.forEach((input) => {
    if (input.state && input.state !== 'connected') return
    result.push({ id: input.id, name: input.name ?? input.id })
  })
  return result
}

export function useMIDIClockSync({
  enabled,
  inputName,
  onStart,
  onContinue,
  onStop,
}: UseMIDIClockSyncOptions): UseMIDIClockSyncReturn {
  const [access, setAccess] = useState<MIDIAccess | null>(null)
  const [accessStatus, setAccessStatus] = useState<'idle' | 'unsupported' | 'requesting' | 'denied' | 'granted'>('idle')
  const [inputs, setInputs] = useState<MIDIInputInfo[]>([])
  const [bpm, setBpm] = useState<number | null>(null)

  const estimatorRef = useRef(createClockBpmEstimator())
  const callbacksRef = useRef({ onStart, onContinue, onStop })
  useEffect(() => {
    callbacksRef.current = { onStart, onContinue, onStop }
  })

  // Request Web MIDI access only while enabled.
  useEffect(() => {
    if (!enabled) {
      setAccess(null)
      setAccessStatus('idle')
      setInputs([])
      return
    }

    if (typeof navigator === 'undefined' || typeof navigator.requestMIDIAccess !== 'function') {
      setAccessStatus('unsupported')
      return
    }

    let cancelled = false
    let grantedAccess: MIDIAccess | null = null
    const handleStateChange = () => {
      if (grantedAccess && !cancelled) setInputs(listInputs(grantedAccess))
    }

    setAccessStatus('requesting')
    navigator
      .requestMIDIAccess({ sysex: false })
      .then((midiAccess) => {
        if (cancelled) return
        grantedAccess = midiAccess
        midiAccess.addEventListener('statechange', handleStateChange)
        setAccess(midiAccess)
        setInputs(listInputs(midiAccess))
        setAccessStatus('granted')
      })
      .catch(() => {
        if (!cancelled) setAccessStatus('denied')
      })

    return () => {
      cancelled = true
      grantedAccess?.removeEventListener('statechange', handleStateChange)
    }
  }, [enabled])

  const selectedInput: MIDIInputInfo | null = inputName
    ? inputs.find((input) => input.name === inputName) ?? null
    : inputs[0] ?? null
  const selectedInputId = selectedInput?.id ?? null

  const handleMessage = useCallback((event: Event) => {
    const midiEvent = event as MIDIMessageEvent
    const kind = parseMIDIRealtimeMessage(midiEvent.data)
    if (!kind) return
    if (kind === 'clock') {
      const timestamp = midiEvent.timeStamp || performance.now()
      const next = estimatorRef.current.tick(timestamp)
      if (next !== null) setBpm(next)
      return
    }
    if (kind === 'start') callbacksRef.current.onStart?.()
    else if (kind === 'continue') callbacksRef.current.onContinue?.()
    else if (kind === 'stop') callbacksRef.current.onStop?.()
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
