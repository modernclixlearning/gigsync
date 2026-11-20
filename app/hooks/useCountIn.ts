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
  /**
   * Count exactly this many beats instead of `bars` whole bars: the lead-in of
   * a levare on the song's first line. The clicks fall on the beats before the
   * downbeat (a fractional length leaves its first part silent).
   */
  totalBeats?: number
  /**
   * The words of a first-line levare are sung over the last `pickupBeats`
   * beats before the song starts: `isPickup` is on for that stretch.
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
 * clicks at the song's tempo, accent on each downbeat. The clicks are
 * scheduled on the audio clock, and the UI number and `onDone` are timed
 * against that same clock, so the song starts right on the next downbeat.
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
    async ({ bpm, beatsPerBar, bars, volume = 1, totalBeats, pickupBeats, onDone }: CountInOptions) => {
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
      const lead = totalBeats !== undefined && totalBeats > 0
      // The length of the count in beats: whole bars, or exactly the lead-in.
      const total = lead ? (totalBeats as number) : countInBeats(perBar, bars)
      const interval = 60 / Math.max(1, bpm)
      const t0 = Tone.now() + LEAD_SECONDS
      const msUntil = (audioTime: number) => Math.max(0, (audioTime - Tone.now()) * 1000)

      // (beat of the count, number shown) of every click. A lead-in clicks the beats right
      // before the downbeat — counted back from it, so the last click is beat `perBar`.
      const clicks: { at: number; number: number }[] = []
      if (lead) {
        for (let k = 1; total - k >= -1e-9; k++) clicks.push({ at: total - k, number: ((perBar - k) % perBar + perBar) % perBar + 1 })
        clicks.reverse()
      } else {
        for (let i = 0; i < total; i++) clicks.push({ at: i, number: (i % perBar) + 1 })
      }
      for (const click of clicks) {
        const at = t0 + click.at * interval
        synth.triggerAttackRelease(click.number === 1 ? ACCENT_HZ : NORMAL_HZ, '32n', at)
        timersRef.current.push(setTimeout(() => setCount(click.number), msUntil(at)))
      }
      if (pickupBeats && pickupBeats > 0) {
        const from = Math.max(0, total - pickupBeats)
        timersRef.current.push(setTimeout(() => setIsPickup(true), msUntil(t0 + from * interval)))
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
