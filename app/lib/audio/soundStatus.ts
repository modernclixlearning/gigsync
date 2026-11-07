/**
 * What is actually sounding on each band channel — recorded samples or the
 * synth — so the UI can say it. A tiny external store (no React inside).
 *
 *  - idle:    the channel has no instrument right now
 *  - loading: samples are downloading; a synth plays in their place meanwhile
 *  - samples: the recorded samples are playing
 *  - synth:   a synthesised voice, by design (e.g. electric piano, pad)
 *  - failed:  the samples could not be loaded; the synth is playing instead
 */

import { useSyncExternalStore } from 'react'

export type BandChannel = 'keys' | 'bass' | 'drums'
export type SoundSourceStatus = 'idle' | 'loading' | 'samples' | 'synth' | 'failed'

let state: Record<BandChannel, SoundSourceStatus> = { keys: 'idle', bass: 'idle', drums: 'idle' }
const listeners = new Set<() => void>()

export function setSoundStatus(channel: BandChannel, status: SoundSourceStatus): void {
  if (state[channel] === status) return
  state = { ...state, [channel]: status }
  listeners.forEach((listener) => listener())
}

export const getSoundStatuses = (): Record<BandChannel, SoundSourceStatus> => state

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSoundStatuses(): Record<BandChannel, SoundSourceStatus> {
  return useSyncExternalStore(subscribe, getSoundStatuses, getSoundStatuses)
}

export const SOUND_STATUS_LABELS: Record<Exclude<SoundSourceStatus, 'idle'>, string> = {
  loading: 'Cargando muestras… (suena sintético)',
  samples: 'Muestras reales',
  synth: 'Sintético',
  failed: 'Sintético: no cargaron las muestras',
}
