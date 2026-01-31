import { useState, useCallback, useRef, useEffect } from 'react'
import type { MicrophoneState } from '~/types/tuner'

export interface UseMicrophoneReturn extends MicrophoneState {
  /** Start microphone stream */
  start: () => Promise<void>
  /** Stop microphone stream */
  stop: () => void
  /** Toggle microphone on/off */
  toggle: () => Promise<void>
  /** Audio analyser node for pitch detection */
  analyser: AnalyserNode | null
  /** Audio context */
  audioContext: AudioContext | null
}

/**
 * Hook for accessing the microphone using Web Audio API
 * Provides audio analysis capabilities for pitch detection
 */
export function useMicrophone(): UseMicrophoneReturn {
  const [state, setState] = useState<MicrophoneState>({
    isActive: false,
    hasPermission: false,
    isRequesting: false,
    error: null,
    sampleRate: null,
  })

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect()
      }
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close()
      }
    }
  }, [])

  const start = useCallback(async () => {
    if (state.isActive) return

    setState(prev => ({ ...prev, isRequesting: true, error: null }))

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })

      streamRef.current = stream

      // Create or resume audio context
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext()
      } else if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      const audioContext = audioContextRef.current

      // Create analyser node for pitch detection
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 4096 // Higher for better frequency resolution
      analyser.smoothingTimeConstant = 0.8
      analyserRef.current = analyser

      // Connect microphone to analyser
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      sourceRef.current = source

      // Note: We don't connect analyser to destination to avoid feedback

      setState({
        isActive: true,
        hasPermission: true,
        isRequesting: false,
        error: null,
        sampleRate: audioContext.sampleRate,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone'
      
      setState(prev => ({
        ...prev,
        isActive: false,
        hasPermission: false,
        isRequesting: false,
        error: errorMessage,
      }))
    }
  }, [state.isActive])

  const stop = useCallback(() => {
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // Disconnect source
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    // Suspend audio context to save resources
    if (audioContextRef.current?.state === 'running') {
      audioContextRef.current.suspend()
    }

    setState(prev => ({
      ...prev,
      isActive: false,
      error: null,
    }))
  }, [])

  const toggle = useCallback(async () => {
    if (state.isActive) {
      stop()
    } else {
      await start()
    }
  }, [state.isActive, start, stop])

  return {
    ...state,
    start,
    stop,
    toggle,
    analyser: analyserRef.current,
    audioContext: audioContextRef.current,
  }
}
