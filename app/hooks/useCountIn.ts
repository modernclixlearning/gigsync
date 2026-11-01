import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import { countInBeats } from '~/lib/playback'

const ACCENT_HZ = 1200
const NORMAL_HZ = 800
/** Small lead so the first click isn't scheduled in the past. */
const LEAD_SECONDS = 0.05

export interface CountInOptions {
  bpm: number
  beatsPerBar: number
  bars: number
  /** 0..1, like the player's click. Default 1. */
  volume?: number
  /** Called on the downbeat right after the last click: start the song here. */
  onDone: () => void
}

export interface UseCountInReturn {
  /** Beat of the bar being counted (1-based), or null when no count-in is running. */
  count: number | null
  isCountingIn: boolean
  start: (options: CountInOptions) => Promise<void>
  cancel: () => void
}

/**
 * Metronome count-in before playback ("Play con precuenta"): whole bars of
 * clicks at the song's tempo, accent on each downbeat. The clicks are
 * scheduled on the audio clock, and the UI number and `onDone` are timed
 * against that same clock, so the song starts right on the next downbeat.
 */
export function useCountIn(): UseCountInReturn {
  const [count, setCount] = useState<number | null>(null)
  const [isCountingIn, setIsCountingIn] = useState(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const synthRef = useRef<Tone.Synth | null>(null)

  const cancel = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    synthRef.current?.dispose()
    synthRef.current = null
    setCount(null)
    setIsCountingIn(false)
  }, [])

  const start = useCallback(
    async ({ bpm, beatsPerBar, bars, volume = 1, onDone }: CountInOptions) => {
      cancel()
      if (Tone.context.state !== 'running') await Tone.start()

      const synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
      }).toDestination()
      synth.volume.value = Tone.gainToDb(Math.max(0.0001, volume))
      synthRef.current = synth
      setIsCountingIn(true)

      const perBar = Math.max(1, Math.round(beatsPerBar))
      const total = countInBeats(perBar, bars)
      const interval = 60 / Math.max(1, bpm)
      const t0 = Tone.now() + LEAD_SECONDS
      const msUntil = (audioTime: number) => Math.max(0, (audioTime - Tone.now()) * 1000)

      for (let i = 0; i < total; i++) {
        const at = t0 + i * interval
        synth.triggerAttackRelease(i % perBar === 0 ? ACCENT_HZ : NORMAL_HZ, '32n', at)
        timersRef.current.push(setTimeout(() => setCount((i % perBar) + 1), msUntil(at)))
      }
      timersRef.current.push(
        setTimeout(() => {
          timersRef.current = []
          // Let the last click ring out before freeing the synth.
          const done = synthRef.current
          synthRef.current = null
          setTimeout(() => done?.dispose(), 300)
          setCount(null)
          setIsCountingIn(false)
          onDone()
        }, msUntil(t0 + total * interval))
      )
    },
    [cancel]
  )

  useEffect(() => cancel, [cancel])

  return { count, isCountingIn, start, cancel }
}
