/**
 * useBPMSync Hook
 * 
 * Synchronizes playback with BPM using Tone.js Transport for precise musical timing.
 * Tracks current beat, bar, and beat-in-bar position, updating at 16th note resolution.
 * 
 * Automatically syncs with the `isPlaying` prop - when true, starts playback; when false, pauses.
 * Requires user interaction to start AudioContext (browser security requirement).
 * 
 * @example
 * ```tsx
 * const bpmSync = useBPMSync({
 *   bpm: 120,
 *   timeSignature: '4/4',
 *   isPlaying: true,
 *   onBeatChange: (beat) => {
 *     console.log(`Beat: ${beat}`)
 *   },
 *   onBarChange: (bar) => {
 *     console.log(`Bar: ${bar}`)
 *   }
 * })
 * 
 * // Manual control
 * await bpmSync.play()
 * bpmSync.pause()
 * bpmSync.seekToBeat(16)
 * ```
 * 
 * @remarks
 * - Requires Tone.js and Web Audio API support
 * - AudioContext must be started from user gesture (click, touch, etc.)
 * - Automatically handles suspended AudioContext
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import * as Tone from 'tone'

/**
 * Options for useBPMSync hook
 */
export interface UseBPMSyncOptions {
  /** Beats per minute (tempo) - range typically 20-300 */
  bpm: number
  /** Time signature in format "beats/noteValue" (e.g., "4/4", "3/4", "6/8") */
  timeSignature: string
  /** Whether playback is active - automatically starts/pauses Transport */
  isPlaying: boolean
  /** Optional callback fired when beat changes (every 16th note) */
  onBeatChange?: (beat: number) => void
  /** Optional callback fired when bar changes */
  onBarChange?: (bar: number) => void
}

/**
 * Return value from useBPMSync hook
 */
export interface UseBPMSyncReturn {
  /** Current absolute beat number (0-based, increments continuously) */
  currentBeat: number
  /** Current bar number (0-based) */
  currentBar: number
  /** Current beat within the current bar (0-based, 0 to beatsPerBar-1) */
  currentBeatInBar: number
  /** Whether Transport is currently running */
  isRunning: boolean
  /**
   * Start playback (resumes AudioContext if suspended)
   * @returns Promise that resolves when AudioContext is ready
   */
  play: () => Promise<void>
  /** Pause playback (keeps position) */
  pause: () => void
  /** Stop and reset to beginning (beat 0) */
  reset: () => void
  /**
   * Seek to a specific beat position
   * @param beat - Target beat number (0-based)
   */
  seekToBeat: (beat: number) => void
  /** Current Transport time in seconds */
  transportTime: number
}

/**
 * Hook to synchronize playback with BPM using Tone.js Transport
 * 
 * Provides precise musical timing with beat/bar tracking. Automatically syncs
 * with `isPlaying` prop and handles AudioContext lifecycle.
 * 
 * @param options - Configuration for BPM synchronization
 * @returns Current playback state and control functions
 */
export function useBPMSync({
  bpm,
  timeSignature,
  isPlaying,
  onBeatChange,
  onBarChange
}: UseBPMSyncOptions): UseBPMSyncReturn {
  const [currentBeat, setCurrentBeat] = useState(0)
  const [currentBar, setCurrentBar] = useState(0)
  const [currentBeatInBar, setCurrentBeatInBar] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [transportTime, setTransportTime] = useState(0)
  
  const loopRef = useRef<Tone.Loop | null>(null)
  const previousBeatRef = useRef(0)
  const previousBarRef = useRef(0)
  const onBeatChangeRef = useRef(onBeatChange)
  const onBarChangeRef = useRef(onBarChange)
  
  // Keep callback refs up to date without triggering effect re-runs
  useEffect(() => {
    onBeatChangeRef.current = onBeatChange
    onBarChangeRef.current = onBarChange
  })
  
  // Parse time signature
  const [beatsPerBar] = timeSignature.split('/').map(Number)
  
  // Initialize Transport
  useEffect(() => {
    Tone.Transport.bpm.value = bpm
    // Parse time signature for Tone.js (e.g., "4/4" -> [4, 4])
    const [beats, noteValue] = timeSignature.split('/').map(Number)
    Tone.Transport.timeSignature = [beats || 4, noteValue || 4]
  }, [bpm, timeSignature])
  
  // Create beat tracking loop
  useEffect(() => {
    // Clean up existing loop
    if (loopRef.current) {
      loopRef.current.dispose()
    }
    
    // Create new loop
    const loop = new Tone.Loop((time) => {
      // Get current position from Transport
      const bars = Tone.Transport.position.toString().split(':')[0]
      const beats = Tone.Transport.position.toString().split(':')[1]
      
      const barNumber = parseInt(bars, 10)
      const beatNumber = parseInt(beats, 10)
      
      // Calculate absolute beat
      const absoluteBeat = barNumber * beatsPerBar + beatNumber
      
      // Schedule UI updates slightly ahead of audio time
      Tone.Draw.schedule(() => {
        setCurrentBeat(absoluteBeat)
        setCurrentBar(barNumber)
        setCurrentBeatInBar(beatNumber)
        setTransportTime(Tone.Transport.seconds)
        
        // Fire callbacks if beat/bar changed
        if (absoluteBeat !== previousBeatRef.current) {
          onBeatChangeRef.current?.(absoluteBeat)
          previousBeatRef.current = absoluteBeat
        }
        
        if (barNumber !== previousBarRef.current) {
          onBarChangeRef.current?.(barNumber)
          previousBarRef.current = barNumber
        }
      }, time)
    }, '16n') // Update at 16th note resolution for smooth tracking
    
    loopRef.current = loop
    loop.start(0)
    
    return () => {
      loop.dispose()
    }
  }, [beatsPerBar])
  
  // Sync with isPlaying prop
  useEffect(() => {
    if (isPlaying && !isRunning) {
      play()
    } else if (!isPlaying && isRunning) {
      pause()
    }
  }, [isPlaying, isRunning])
  
  const play = useCallback(async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start()
    }
    
    Tone.Transport.start()
    setIsRunning(true)
  }, [])
  
  const pause = useCallback(() => {
    Tone.Transport.pause()
    setIsRunning(false)
  }, [])
  
  const reset = useCallback(() => {
    Tone.Transport.stop()
    Tone.Transport.position = 0
    setCurrentBeat(0)
    setCurrentBar(0)
    setCurrentBeatInBar(0)
    setIsRunning(false)
    previousBeatRef.current = 0
    previousBarRef.current = 0
  }, [])
  
  const seekToBeat = useCallback((beat: number) => {
    const bar = Math.floor(beat / beatsPerBar)
    const beatInBar = beat % beatsPerBar
    
    Tone.Transport.position = `${bar}:${beatInBar}:0`
    setCurrentBeat(beat)
    setCurrentBar(bar)
    setCurrentBeatInBar(beatInBar)
  }, [beatsPerBar])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loopRef.current) {
        loopRef.current.dispose()
      }
      Tone.Transport.stop()
    }
  }, [])
  
  return {
    currentBeat,
    currentBar,
    currentBeatInBar,
    isRunning,
    play,
    pause,
    reset,
    seekToBeat,
    transportTime
  }
}
