import { useState, useCallback, useRef, useEffect } from 'react'
import * as Tone from 'tone'
import { ACCENT_VELOCITY, beatAccent } from '~/lib/metronome/beatAccent'

export interface MetronomeState {
  isPlaying: boolean
  bpm: number
  currentBeat: number
  timeSignature: string
  sound: 'classic' | 'woodblock' | 'sticks' | 'electronic' | 'silent'
  volume: number
  accentFirst: boolean
  subdivisions: boolean
  error: string | null
}

export interface UseMetronomeReturn extends MetronomeState {
  start: () => Promise<void>
  stop: () => void
  toggle: () => Promise<void>
  setBpm: (bpm: number) => void
  setTimeSignature: (signature: string) => void
  setSound: (sound: MetronomeState['sound']) => void
  setVolume: (volume: number) => void
  setAccentFirst: (accent: boolean) => void
  toggleSubdivisions: () => void
}

const SOUNDS: Record<MetronomeState['sound'], { accent: number; normal: number }> = {
  classic: { accent: 1200, normal: 800 },
  woodblock: { accent: 400, normal: 300 },
  sticks: { accent: 2000, normal: 1500 },
  electronic: { accent: 600, normal: 400 },
  silent: { accent: 0, normal: 0 },
}

function parseTimeSignature(signature: string): { beats: number; noteValue: number } {
  const [beats, noteValue] = signature.split('/').map(Number)
  return { beats: beats || 4, noteValue: noteValue || 4 }
}

/**
 * The practice metronome. It runs on its own Tone.Clock — never on the shared
 * Transport that the song player plays and scrolls on — so it can be opened
 * over a song (or run beside it) without moving the song's position or tempo.
 */
export function useMetronome(initialBpm: number = 120, initialTimeSignature: string = '4/4'): UseMetronomeReturn {
  const [state, setState] = useState<MetronomeState>({
    isPlaying: false,
    bpm: initialBpm,
    currentBeat: 0,
    timeSignature: initialTimeSignature,
    sound: 'classic',
    volume: 0.8,
    accentFirst: true,
    subdivisions: false,
    error: null,
  })

  const synthRef = useRef<Tone.Synth | null>(null)
  const clockRef = useRef<Tone.Clock | null>(null)
  const beatIndexRef = useRef(0)
  const isInitializedRef = useRef(false)
  // Read from the audio callback, outside React's render cycle.
  const optionsRef = useRef(state)
  optionsRef.current = state

  // Initialize synth
  useEffect(() => {
    try {
      synthRef.current = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.001,
          decay: 0.1,
          sustain: 0,
          release: 0.1,
        },
      }).toDestination()
      isInitializedRef.current = true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize audio synthesizer'
      setState((prev) => ({ ...prev, error: errorMessage }))
      isInitializedRef.current = false
    }

    return () => {
      if (clockRef.current) {
        clockRef.current.stop()
        clockRef.current.dispose()
        clockRef.current = null
      }
      if (synthRef.current) {
        synthRef.current.dispose()
        synthRef.current = null
      }
      isInitializedRef.current = false
    }
  }, [])

  // Update volume
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.volume.value = Tone.gainToDb(state.volume)
    }
  }, [state.volume])

  // Tempo: the clock ticks once per beat, or twice with subdivisions.
  useEffect(() => {
    if (clockRef.current) {
      clockRef.current.frequency.value = (state.bpm / 60) * (state.subdivisions ? 2 : 1)
    }
  }, [state.bpm, state.subdivisions, state.isPlaying])

  // A new meter or subdivision starts the bar over.
  useEffect(() => {
    beatIndexRef.current = 0
  }, [state.timeSignature, state.subdivisions])

  /** One tick of the clock, at its exact audio time. */
  const tick = useCallback((time: number) => {
    const synth = synthRef.current
    if (!synth) return
    const { timeSignature, sound, accentFirst, subdivisions } = optionsRef.current
    const { beats, noteValue } = parseTimeSignature(timeSignature)
    const perBeat = subdivisions ? 2 : 1
    const index = beatIndexRef.current
    const beatInBar = Math.floor(index / perBeat)

    // Only the beat itself is accented, never its subdivision. Compound meters
    // (6/8, 9/8, 12/8) accent each group of three as well as the first beat.
    const accent = accentFirst && index % perBeat === 0 ? beatAccent(beatInBar, beats, noteValue) : 'normal'
    const soundConfig = SOUNDS[sound]
    const frequency = accent === 'normal' ? soundConfig.normal : soundConfig.accent
    if (frequency > 0) synth.triggerAttackRelease(frequency, '32n', time, ACCENT_VELOCITY[accent])

    setState((prev: MetronomeState) => ({ ...prev, currentBeat: Math.floor(index / perBeat) + 1 }))
    beatIndexRef.current = (index + 1) % (beats * perBeat)
  }, [])

  const start = useCallback(async () => {
    if (!isInitializedRef.current || !synthRef.current) {
      setState((prev) => ({ 
        ...prev, 
        error: 'Audio synthesizer not initialized. Please refresh the page.' 
      }))
      return
    }

    try {
      // Check if Tone.js context is suspended and resume if needed
      if (Tone.context.state === 'suspended') {
        await Tone.context.resume()
      }

      // Start Tone.js audio context (requires user interaction)
      await Tone.start()

      if (clockRef.current) {
        clockRef.current.stop()
        clockRef.current.dispose()
      }
      const { bpm, subdivisions } = optionsRef.current
      beatIndexRef.current = 0
      clockRef.current = new Tone.Clock({
        callback: tick,
        frequency: (bpm / 60) * (subdivisions ? 2 : 1),
      })
      clockRef.current.start()
      setState((prev: MetronomeState) => ({ 
        ...prev, 
        isPlaying: true, 
        currentBeat: 1,
        error: null 
      }))
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to start metronome. Please interact with the page first (click anywhere) and try again.'
      setState((prev: MetronomeState) => ({ 
        ...prev, 
        isPlaying: false,
        error: errorMessage 
      }))
      console.error('Metronome start error:', error)
    }
  }, [tick])

  const stop = useCallback(() => {
    try {
      if (clockRef.current) {
        clockRef.current.stop()
        clockRef.current.dispose()
        clockRef.current = null
      }
      beatIndexRef.current = 0
      setState((prev: MetronomeState) => ({ 
        ...prev, 
        isPlaying: false, 
        currentBeat: 0,
        error: null 
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop metronome'
      setState((prev) => ({ ...prev, error: errorMessage }))
    }
  }, [])

  const toggle = useCallback(async () => {
    if (state.isPlaying) {
      stop()
    } else {
      await start()
    }
  }, [state.isPlaying, start, stop])

  const setBpm = useCallback((bpm: number) => {
    const clampedBpm = Math.max(20, Math.min(300, bpm))
    setState((prev: MetronomeState) => ({ ...prev, bpm: clampedBpm }))
  }, [])

  const setTimeSignature = useCallback((signature: string) => {
    setState((prev: MetronomeState) => ({ ...prev, timeSignature: signature }))
  }, [])

  const setSound = useCallback((sound: MetronomeState['sound']) => {
    setState((prev: MetronomeState) => ({ ...prev, sound, error: null }))
  }, [])

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    setState((prev: MetronomeState) => ({ ...prev, volume: clampedVolume }))
  }, [])

  const setAccentFirst = useCallback((accentFirst: boolean) => {
    setState((prev: MetronomeState) => ({ ...prev, accentFirst, error: null }))
  }, [])

  const toggleSubdivisions = useCallback(() => {
    setState((prev: MetronomeState) => ({ ...prev, subdivisions: !prev.subdivisions, error: null }))
  }, [])

  return {
    ...state,
    start,
    stop,
    toggle,
    setBpm,
    setTimeSignature,
    setSound,
    setVolume,
    setAccentFirst,
    toggleSubdivisions,
  }
}
