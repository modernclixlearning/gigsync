/**
 * useBPMSync Hook
 * Synchronizes playback with BPM using Tone.js Transport
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import * as Tone from 'tone'

export interface UseBPMSyncOptions {
  bpm: number
  timeSignature: string
  isPlaying: boolean
  onBeatChange?: (beat: number) => void
  onBarChange?: (bar: number) => void
}

export interface UseBPMSyncReturn {
  currentBeat: number
  currentBar: number
  currentBeatInBar: number
  isRunning: boolean
  play: () => Promise<void>
  pause: () => void
  reset: () => void
  seekToBeat: (beat: number) => void
  transportTime: number
}

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
