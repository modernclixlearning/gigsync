import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import { countInBeats } from '~/lib/playback'
import { ACCENT_VELOCITY, beatAccent, beatCountLabel, meterOf } from '~/lib/metronome/beatAccent'

const ACCENT_HZ = 1200
const NORMAL_HZ = 800
/** Small lead so the first click isn't scheduled in the past. */
const LEAD_SECONDS = 0.05

export interface CountInOptions {
  bpm: number
  beatsPerBar: number
  /** The song's meter ("6/8"): 6/8, 9/8 and 12/8 are counted "1 2 3 1 2 3", accenting each group. */
  timeSignature?: string
  bars: number
  /** 0..1, like the player's click. Default 1. */
  volume?: number
  /**
   * The words of a first-line levare are sung over the last `pickupBeats`
   * beats before the song starts, with no accompaniment: `isPickup` is on for
   * that stretch and its beats are counted (the number is shown) but not
   * clicked, so the click does not step on the voice singing alone.
   */
  pickupBeats?: number
  /** Called on the downbeat right after the last click: start the song here. */
  onDone: () => void
}

export interface UseCountInReturn {
  /** Beat of the bar being counted (1-based), or null when no count-in is running. */
  count: number | null
  isCountingIn: boolean
  /** True while the levare of the first line is being sung (the last `pickupBeats` of the count). */
  isPickup: boolean
  start: (options: CountInOptions) => Promise<void>
  cancel: () => void
}

/**
 * Metronome count-in before playback ("Play con precuenta"): whole bars of
 * clicks at the song's tempo, accent on each downbeat (and on each group of
 * three in 6/8, 9/8 and 12/8, which are counted "1 2 3 1 2 3"). The clicks are
 * scheduled on the audio clock, and the UI number and `onDone` are timed
 * against that same clock, so the song starts right on the next downbeat.
 * The last `pickupBeats` beats (a levare) are counted in silence.
 */
export function useCountIn(): UseCountInReturn {
  const [count, setCount] = useState<number | null>(null)
  const [isCountingIn, setIsCountingIn] = useState(false)
  const [isPickup, setIsPickup] = useState(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const synthRef = useRef<Tone.Synth | null>(null)

  const cancel = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    synthRef.current?.dispose()
    synthRef.current = null
    setCount(null)
    setIsCountingIn(false)
    setIsPickup(false)
  }, [])

  const start = useCallback(
    async ({ bpm, beatsPerBar, timeSignature, bars, volume = 1, pickupBeats, onDone }: CountInOptions) => {
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
      // Whole bars, and never shorter than the levare that is sung at the end of it.
      const total = Math.max(countInBeats(perBar, bars), Math.ceil((pickupBeats ?? 0) / perBar) * perBar)
      const interval = 60 / Math.max(1, bpm)
      const { unit } = meterOf(timeSignature ?? '4/4')
      const t0 = Tone.now() + LEAD_SECONDS
      const msUntil = (audioTime: number) => Math.max(0, (audioTime - Tone.now()) * 1000)

      // From this beat on the levare is sung: counted, but not clicked.
      const pickupFrom = pickupBeats && pickupBeats > 0 ? Math.max(0, total - pickupBeats) : total
      for (let i = 0; i < total; i++) {
        const at = t0 + i * interval
        const beatInBar = i % perBar
        const number = beatCountLabel(beatInBar, perBar, unit)
        if (i < pickupFrom - 1e-9) {
          const accent = beatAccent(beatInBar, perBar, unit)
          synth.triggerAttackRelease(accent === 'normal' ? NORMAL_HZ : ACCENT_HZ, '32n', at, ACCENT_VELOCITY[accent])
        }
        timersRef.current.push(setTimeout(() => setCount(number), msUntil(at)))
      }
      if (pickupFrom < total) {
        timersRef.current.push(setTimeout(() => setIsPickup(true), msUntil(t0 + pickupFrom * interval)))
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
          setIsPickup(false)
          onDone()
        }, msUntil(t0 + total * interval))
      )
    },
    [cancel]
  )

  useEffect(() => cancel, [cancel])

  return { count, isCountingIn, isPickup, start, cancel }
}
