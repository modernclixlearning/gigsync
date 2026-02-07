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
    error: null,
  })

  const synthRef = useRef<Tone.Synth | null>(null)
  const loopRef = useRef<Tone.Loop | null>(null)
  const beatIndexRef = useRef(0)
  const isInitializedRef = useRef(false)

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
      if (loopRef.current) {
        loopRef.current.dispose()
        loopRef.current = null
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

  // Update BPM
  useEffect(() => {
    if (isInitializedRef.current) {
      try {
        Tone.getTransport().bpm.value = state.bpm
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update BPM'
        setState((prev) => ({ ...prev, error: errorMessage }))
      }
    }
  }, [state.bpm])

  // Helper function to create and start the loop
  const createLoop = useCallback(() => {
    if (!isInitializedRef.current || !synthRef.current) {
      return
    }

    const { beats } = parseTimeSignature(state.timeSignature)
    const soundConfig = SOUNDS[state.sound]
    
    beatIndexRef.current = 0

    if (loopRef.current) {
      loopRef.current.dispose()
      loopRef.current = null
    }

    const interval = state.subdivisions ? '8n' : '4n'
    const beatsPerMeasure = state.subdivisions ? beats * 2 : beats

    loopRef.current = new Tone.Loop((time: number) => {
      if (!synthRef.current) return

      const isAccent = state.accentFirst && beatIndexRef.current === 0
      const frequency = isAccent ? soundConfig.accent : soundConfig.normal
      
      if (frequency > 0) {
        synthRef.current.triggerAttackRelease(frequency, '32n', time)
      }

      // Improved beat calculation for subdivisions
      let currentBeat: number
      if (state.subdivisions) {
        // For subdivisions, map every 2 ticks to 1 beat
        currentBeat = Math.floor(beatIndexRef.current / 2) + 1
      } else {
        // For regular beats, use index directly
        currentBeat = beatIndexRef.current + 1
      }

      setState((prev: MetronomeState) => ({ ...prev, currentBeat }))
      
      beatIndexRef.current = (beatIndexRef.current + 1) % beatsPerMeasure
    }, interval).start(0)
  }, [state.timeSignature, state.sound, state.accentFirst, state.subdivisions])

  // Restart loop when critical settings change while playing
  useEffect(() => {
    if (state.isPlaying && isInitializedRef.current) {
      try {
        createLoop()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update metronome settings'
        setState((prev) => ({ ...prev, error: errorMessage }))
      }
    }
  }, [state.isPlaying, state.sound, state.accentFirst, state.subdivisions, createLoop])

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
      
      // Validate Transport state
      const transport = Tone.getTransport()
      if (!transport) {
        throw new Error('Transport not available')
      }

      createLoop()
      transport.start()
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
  }, [createLoop])

  const stop = useCallback(() => {
    try {
      if (isInitializedRef.current) {
        const transport = Tone.getTransport()
        if (transport && transport.state !== 'stopped') {
          transport.stop()
        }
      }
      if (loopRef.current) {
        loopRef.current.stop()
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
