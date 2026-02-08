import { useState, useCallback, useRef, useEffect } from 'react'
import type { MicrophoneState } from '~/types/tuner'
import {
  isWebAudioAPISupported,
  isGetUserMediaSupported,
  createAudioContext,
  getUserMedia,
  getUserMediaErrorMessage,
} from '~/lib/audio/webAudioUtils'

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

  // Check browser compatibility on mount
  useEffect(() => {
    if (!isWebAudioAPISupported()) {
      setState(prev => ({
        ...prev,
        error: 'Web Audio API is not supported in this browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.',
      }))
      return
    }

    if (!isGetUserMediaSupported()) {
      setState(prev => ({
        ...prev,
        error: 'Microphone access is not supported in this browser. Please use a modern browser.',
      }))
      return
    }
  }, [])

  // Handle AudioContext state changes
  useEffect(() => {
    const audioContext = audioContextRef.current
    if (!audioContext) return

    const handleStateChange = () => {
      if (audioContext.state === 'suspended' && state.isActive) {
        // AudioContext was suspended (e.g., browser tab became inactive)
        setState(prev => ({
          ...prev,
          error: 'Audio processing was suspended. Please resume the audio context.',
        }))
      }
    }

    audioContext.addEventListener('statechange', handleStateChange)

    return () => {
      audioContext.removeEventListener('statechange', handleStateChange)
    }
  }, [state.isActive])

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

    // Check compatibility before starting
    if (!isWebAudioAPISupported() || !isGetUserMediaSupported()) {
      setState(prev => ({
        ...prev,
        isRequesting: false,
        error: 'Web Audio API or microphone access is not supported in this browser.',
      }))
      return
    }

    setState(prev => ({ ...prev, isRequesting: true, error: null }))

    try {
      // Request microphone access with cross-browser compatibility
      const stream = await getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })

      streamRef.current = stream

      // Create or resume audio context with cross-browser compatibility
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        const newContext = createAudioContext()
        if (!newContext) {
          throw new Error('Failed to create AudioContext')
        }
        audioContextRef.current = newContext
      }

      const audioContext = audioContextRef.current

      // Resume if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      // Verify context is running
      if (audioContext.state !== 'running') {
        throw new Error(`AudioContext is in ${audioContext.state} state`)
      }

      // Clean up old analyser and source if they exist
      if (analyserRef.current) {
        analyserRef.current.disconnect()
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect()
      }

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
      const errorMessage = getUserMediaErrorMessage(err)
      
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

    // Disconnect analyser
    if (analyserRef.current) {
      analyserRef.current.disconnect()
      analyserRef.current = null
    }

    // Suspend audio context to save resources (but don't close it)
    if (audioContextRef.current?.state === 'running') {
      audioContextRef.current.suspend().catch(err => {
        console.warn('Failed to suspend AudioContext:', err)
      })
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

  // Return current refs (they update when start() is called)
  // Note: These refs are updated synchronously in start(), so they should be current
  return {
    ...state,
    start,
    stop,
    toggle,
    analyser: analyserRef.current,
    audioContext: audioContextRef.current,
  }
}
