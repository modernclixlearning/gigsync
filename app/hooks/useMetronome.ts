import { useState, useCallback, useRef, useEffect } from 'react'
import * as Tone from 'tone'

export interface MetronomeState {
  isPlaying: boolean
  bpm: number
  currentBeat: number
  timeSignature: string
  sound: 'classic' | 'woodblock' | 'sticks' | 'electronic' | 'silent'
  volume: number
  accentFirst: boolean
  subdivisions: boolean
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

export function useMetronome(initialBpm: number = 120): UseMetronomeReturn {
  const [state, setState] = useState<MetronomeState>({
    isPlaying: false,
    bpm: initialBpm,
    currentBeat: 0,
    timeSignature: '4/4',
    sound: 'classic',
    volume: 0.8,
    accentFirst: true,
    subdivisions: false,
  })

  const synthRef = useRef<Tone.Synth | null>(null)
  const loopRef = useRef<Tone.Loop | null>(null)
  const beatIndexRef = useRef(0)

  // Initialize synth
  useEffect(() => {
    synthRef.current = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0,
        release: 0.1,
      },
    }).toDestination()

    return () => {
      if (loopRef.current) {
        loopRef.current.dispose()
      }
      if (synthRef.current) {
        synthRef.current.dispose()
      }
    }
  }, [])

  // Update volume
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.volume.value = Tone.gainToDb(state.volume)
    }
  }, [state.volume])

  // Update BPM
  useEffect(() => {
    Tone.getTransport().bpm.value = state.bpm
  }, [state.bpm])

  const start = useCallback(async () => {
    await Tone.start()
    
    const { beats } = parseTimeSignature(state.timeSignature)
    const soundConfig = SOUNDS[state.sound]
    
    beatIndexRef.current = 0

    if (loopRef.current) {
      loopRef.current.dispose()
    }

    const interval = state.subdivisions ? '8n' : '4n'
    const beatsPerMeasure = state.subdivisions ? beats * 2 : beats

    loopRef.current = new Tone.Loop((time: number) => {
      const isAccent = state.accentFirst && beatIndexRef.current === 0
      const frequency = isAccent ? soundConfig.accent : soundConfig.normal
      
      if (frequency > 0 && synthRef.current) {
        synthRef.current.triggerAttackRelease(frequency, '32n', time)
      }

      const currentBeat = state.subdivisions 
        ? Math.floor(beatIndexRef.current / 2) + 1
        : beatIndexRef.current + 1

      setState((prev: MetronomeState) => ({ ...prev, currentBeat }))
      
      beatIndexRef.current = (beatIndexRef.current + 1) % beatsPerMeasure
    }, interval).start(0)

    Tone.getTransport().start()
    setState((prev: MetronomeState) => ({ ...prev, isPlaying: true, currentBeat: 1 }))
  }, [state.timeSignature, state.sound, state.accentFirst, state.subdivisions])

  const stop = useCallback(() => {
    Tone.getTransport().stop()
    if (loopRef.current) {
      loopRef.current.stop()
    }
    beatIndexRef.current = 0
    setState((prev: MetronomeState) => ({ ...prev, isPlaying: false, currentBeat: 0 }))
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
    setState((prev: MetronomeState) => ({ ...prev, sound }))
  }, [])

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    setState((prev: MetronomeState) => ({ ...prev, volume: clampedVolume }))
  }, [])

  const setAccentFirst = useCallback((accentFirst: boolean) => {
    setState((prev: MetronomeState) => ({ ...prev, accentFirst }))
  }, [])

  const toggleSubdivisions = useCallback(() => {
    setState((prev: MetronomeState) => ({ ...prev, subdivisions: !prev.subdivisions }))
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
