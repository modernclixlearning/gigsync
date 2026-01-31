import { useState, useCallback, useRef } from 'react'

export interface UseTapTempoReturn {
  taps: number[]
  calculatedBpm: number | null
  tap: () => void
  reset: () => void
}

const TAP_TIMEOUT = 2000 // Reset taps after 2 seconds of inactivity
const MIN_TAPS = 2 // Minimum taps needed to calculate BPM
const MAX_TAPS = 8 // Maximum taps to keep for averaging

export function useTapTempo(): UseTapTempoReturn {
  const [taps, setTaps] = useState<number[]>([])
  const [calculatedBpm, setCalculatedBpm] = useState<number | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const calculateBpm = useCallback((tapTimes: number[]): number | null => {
    if (tapTimes.length < MIN_TAPS) {
      return null
    }

    // Calculate intervals between taps
    const intervals: number[] = []
    for (let i = 1; i < tapTimes.length; i++) {
      intervals.push(tapTimes[i] - tapTimes[i - 1])
    }

    // Average the intervals
    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length

    // Convert to BPM (60000ms per minute / average interval)
    const bpm = Math.round(60000 / averageInterval)

    // Clamp BPM to reasonable range
    return Math.max(20, Math.min(300, bpm))
  }, [])

  const tap = useCallback(() => {
    const now = Date.now()

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setTaps((prevTaps: number[]) => {
      // Check if last tap was too long ago - reset if so
      const lastTap = prevTaps[prevTaps.length - 1]
      if (lastTap && now - lastTap > TAP_TIMEOUT) {
        const newTaps = [now]
        setCalculatedBpm(null)
        return newTaps
      }

      // Add new tap, keeping only the last MAX_TAPS
      const newTaps = [...prevTaps, now].slice(-MAX_TAPS)
      
      // Calculate BPM from new taps
      const bpm = calculateBpm(newTaps)
      setCalculatedBpm(bpm)
      
      return newTaps
    })

    // Set timeout to reset taps after inactivity
    timeoutRef.current = setTimeout(() => {
      setTaps([])
      setCalculatedBpm(null)
    }, TAP_TIMEOUT)
  }, [calculateBpm])

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setTaps([])
    setCalculatedBpm(null)
  }, [])

  return {
    taps,
    calculatedBpm,
    tap,
    reset,
  }
}
