/**
 * useMIDIAccess Hook
 *
 * Requests Web MIDI access while `enabled` and keeps the list of connected
 * inputs up to date (hot-plugging included). Shared by the DAW clock sync and
 * the MIDI keyboard recorder. When `enabled` is false nothing is requested, so
 * the browser never shows the MIDI permission prompt.
 */

import { useEffect, useState } from 'react'

export interface MIDIInputInfo {
  id: string
  name: string
}

export type MIDIAccessStatus = 'idle' | 'unsupported' | 'requesting' | 'denied' | 'granted'

export interface UseMIDIAccessReturn {
  access: MIDIAccess | null
  accessStatus: MIDIAccessStatus
  /** Connected MIDI inputs (empty until access is granted). */
  inputs: MIDIInputInfo[]
}

function listInputs(access: MIDIAccess): MIDIInputInfo[] {
  const result: MIDIInputInfo[] = []
  access.inputs.forEach((input) => {
    if (input.state && input.state !== 'connected') return
    result.push({ id: input.id, name: input.name ?? input.id })
  })
  return result
}

export function useMIDIAccess(enabled: boolean): UseMIDIAccessReturn {
  const [access, setAccess] = useState<MIDIAccess | null>(null)
  const [accessStatus, setAccessStatus] = useState<MIDIAccessStatus>('idle')
  const [inputs, setInputs] = useState<MIDIInputInfo[]>([])

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

  return { access, accessStatus, inputs }
}
