/**
 * useLiveMonitor Hook
 *
 * Plays the band's instruments from a MIDI controller while the player is
 * open: the keys sound with the instrument of the chosen role (the song's own
 * bass, piano, lead or arrangement voice), and the drum pads — MIDI channel
 * 10 — always hit the drum kit, whatever role the keys are on. With the drums
 * as the role, the keys are a kit too.
 *
 * Notes sound as soon as they arrive (no Transport, no quantizing): this is
 * for playing along, not for recording.
 */

import { useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import type { BassVoice } from '~/lib/audio/bandSound'
import type { TrackVoice } from '~/lib/audio/bandTracks'
import {
  createBassInstrument,
  createDrumKit,
  createKeysInstrument,
  createTrackInstrument,
  type ChordInstrument,
  type DrumKit,
} from '~/lib/audio/instruments'
import { drumPartForPitch, type MonitorRole } from '~/lib/midi/liveMonitor'
import { MIDI_DRUM_CHANNEL, parseMIDINoteMessage } from '~/lib/midi/notes'

export interface UseLiveMonitorOptions {
  enabled: boolean
  access: MIDIAccess | null
  /** Input to listen to; null → silent. */
  inputId: string | null
  /** What the keys play. */
  role: MonitorRole
  bassVoice: BassVoice
  leadVoice: TrackVoice
  arrangementVoice: TrackVoice
  /** Level of the role's instrument, 0..1. */
  volume?: number
  /** Level of the drum kit (pads), 0..1. */
  drumsVolume?: number
}

export interface UseLiveMonitorReturn {
  /** Pitches held on the keys right now, ascending. */
  held: number[]
  /** The drum hit last, with a counter that changes on every hit (to flash it). */
  lastDrum: { part: 'kick' | 'snare' | 'hat'; count: number } | null
}

function createRoleInstrument(role: MonitorRole, voices: Pick<UseLiveMonitorOptions, 'bassVoice' | 'leadVoice' | 'arrangementVoice'>): ChordInstrument | null {
  // Never reported as a band channel: the band's own instruments say what they sound like.
  if (role === 'bass') return createBassInstrument(voices.bassVoice, { reportStatus: false })
  if (role === 'keys') return createKeysInstrument('piano', { reportStatus: false })
  if (role === 'lead') return createTrackInstrument(voices.leadVoice)
  if (role === 'arrangement') return createTrackInstrument(voices.arrangementVoice)
  return null
}

export function useLiveMonitor({
  enabled,
  access,
  inputId,
  role,
  bassVoice,
  leadVoice,
  arrangementVoice,
  volume = 0.6,
  drumsVolume = 0.5,
}: UseLiveMonitorOptions): UseLiveMonitorReturn {
  const [held, setHeld] = useState<number[]>([])
  const [lastDrum, setLastDrum] = useState<UseLiveMonitorReturn['lastDrum']>(null)
  const instrumentRef = useRef<ChordInstrument | null>(null)
  const kitRef = useRef<DrumKit | null>(null)
  const heldRef = useRef(new Set<number>())
  const roleRef = useRef(role)
  roleRef.current = role

  // The voice the role sounds with (only the one in use rebuilds the instrument).
  const voiceKey = role === 'bass' ? bassVoice : role === 'lead' ? leadVoice : role === 'arrangement' ? arrangementVoice : role

  // The role's instrument, alive while the monitor is on.
  useEffect(() => {
    if (!enabled) return
    const instrument = createRoleInstrument(role, { bassVoice, leadVoice, arrangementVoice })
    instrumentRef.current = instrument
    return () => {
      instrumentRef.current = null
      heldRef.current.clear()
      setHeld([])
      instrument?.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, role, voiceKey])

  // The drum kit: always there for the pads.
  useEffect(() => {
    if (!enabled) return
    const kit = createDrumKit({ reportStatus: false })
    kitRef.current = kit
    return () => {
      kitRef.current = null
      kit.dispose()
    }
  }, [enabled])

  useEffect(() => {
    if (instrumentRef.current) instrumentRef.current.synth.volume.value = Tone.gainToDb(Math.max(0.0001, volume))
  }, [volume, enabled, role, voiceKey])
  useEffect(() => {
    kitRef.current?.setVolume(Math.max(0, drumsVolume))
  }, [drumsVolume, enabled])

  useEffect(() => {
    if (!enabled || !access || !inputId) return
    const input = access.inputs.get(inputId)
    if (!input) return
    let drumCount = 0

    const onMessage = (event: Event) => {
      const message = parseMIDINoteMessage((event as MIDIMessageEvent).data)
      if (!message || message.type === 'sustain') return
      if (Tone.getContext().state !== 'running') void Tone.start().catch(() => undefined)
      const now = Tone.immediate()

      if (message.channel === MIDI_DRUM_CHANNEL || roleRef.current === 'drums') {
        if (message.type !== 'note-on') return
        const part = drumPartForPitch(message.pitch)
        kitRef.current?.hit(part, now, message.velocity / 127)
        drumCount += 1
        setLastDrum({ part, count: drumCount })
        return
      }

      const synth = instrumentRef.current?.synth
      if (!synth) return
      const frequency = [Tone.Frequency(message.pitch, 'midi').toFrequency()]
      if (message.type === 'note-on') {
        // A key struck again while it still sounds re-attacks.
        if (heldRef.current.has(message.pitch)) synth.triggerRelease(frequency, now)
        synth.triggerAttack(frequency, now, message.velocity / 127)
        heldRef.current.add(message.pitch)
      } else {
        synth.triggerRelease(frequency, now)
        heldRef.current.delete(message.pitch)
      }
      setHeld([...heldRef.current].sort((a, b) => a - b))
    }

    input.addEventListener('midimessage', onMessage)
    // addEventListener (unlike the onmidimessage setter) doesn't implicitly open the port.
    void input.open?.().catch(() => undefined)
    return () => {
      input.removeEventListener('midimessage', onMessage)
      instrumentRef.current?.synth.releaseAll()
      heldRef.current.clear()
      setHeld([])
    }
  }, [enabled, access, inputId])

  return { held, lastDrum }
}
