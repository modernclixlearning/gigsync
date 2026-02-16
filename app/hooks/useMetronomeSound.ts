/**
 * useMetronomeSound Hook
 * Provides metronome sound synchronized with BPM sync
 * Reuses logic from useMetronome but integrates with useBPMSync
 */

import { useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'

export type MetronomeSoundType = 'classic' | 'woodblock' | 'sticks' | 'electronic' | 'silent'

export interface UseMetronomeSoundOptions {
  enabled: boolean
  bpm: number
  timeSignature: string
  currentBeatInBar: number
  currentBar: number
  isPlaying: boolean
  sound?: MetronomeSoundType
  volume?: number
  accentFirst?: boolean
}

const SOUNDS: Record<MetronomeSoundType, { accent: number; normal: number }> = {
  classic: { accent: 1200, normal: 800 },
  woodblock: { accent: 400, normal: 300 },
  sticks: { accent: 2000, normal: 1500 },
  electronic: { accent: 600, normal: 400 },
  silent: { accent: 0, normal: 0 },
}

function parseTimeSignature(signature: string): number {
  const [beats] = signature.split('/').map(Number)
  return beats || 4
}

export function useMetronomeSound({
  enabled,
  bpm,
  timeSignature,
  currentBeatInBar,
  currentBar,
  isPlaying,
  sound = 'classic',
  volume = 0.6,
  accentFirst = true,
}: UseMetronomeSoundOptions): void {
  const synthRef = useRef<Tone.Synth | null>(null)
  const previousBeatInBarRef = useRef<number>(-1)
  const isInitializedRef = useRef(false)

  // Initialize synth
  useEffect(() => {
    if (!enabled) {
      // Clean up when disabled
      if (synthRef.current) {
        synthRef.current.dispose()
        synthRef.current = null
      }
      isInitializedRef.current = false
      previousBeatInBarRef.current = -1
      return
    }

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
      console.error('Failed to initialize metronome sound:', error)
      isInitializedRef.current = false
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.dispose()
        synthRef.current = null
      }
      isInitializedRef.current = false
      previousBeatInBarRef.current = -1
    }
  }, [enabled])

  // Update volume
  useEffect(() => {
    if (synthRef.current && enabled) {
      synthRef.current.volume.value = Tone.gainToDb(volume)
    }
  }, [volume, enabled])

  // Play sound when beat changes
  useEffect(() => {
    if (!enabled || !isPlaying || !isInitializedRef.current || !synthRef.current) {
      return
    }

    // Only play sound when beat actually changes
    if (currentBeatInBar !== previousBeatInBarRef.current && currentBeatInBar >= 0) {
      const beatsPerBar = parseTimeSignature(timeSignature)
      // currentBeatInBar is 0-based (0, 1, 2, 3), so accent is on beat 0
      const isAccent = accentFirst && currentBeatInBar === 0
      const soundConfig = SOUNDS[sound]
      const frequency = isAccent ? soundConfig.accent : soundConfig.normal

      if (frequency > 0) {
        try {
          // Use Tone.now() for immediate playback
          // triggerAttackRelease needs audio time, not Transport time
          const now = Tone.now()
          synthRef.current.triggerAttackRelease(frequency, '32n', now)
        } catch (error) {
          console.error('Failed to play metronome sound:', error)
        }
      }

      previousBeatInBarRef.current = currentBeatInBar
    }
  }, [
    enabled,
    isPlaying,
    currentBeatInBar,
    currentBar,
    timeSignature,
    sound,
    accentFirst,
  ])

  // Reset previous beat when stopped
  useEffect(() => {
    if (!isPlaying) {
      previousBeatInBarRef.current = -1
    }
  }, [isPlaying])
}
