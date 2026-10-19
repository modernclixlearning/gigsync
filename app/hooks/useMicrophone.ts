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

/** How long to wait for a suspended AudioContext to resume on its own. */
const RESUME_TIMEOUT_MS = 500

/** The mic is granted but the browser won't run audio until the user taps. */
class AudioNeedsGestureError extends Error {
  constructor() {
    super('Tocá "Activar micrófono" para empezar a afinar.')
    this.name = 'AudioNeedsGestureError'
  }
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
  const startingRef = useRef<Promise<void> | null>(null)

  // Check browser compatibility on mount
  useEffect(() => {
    if (!isWebAudioAPISupported()) {
      setState(prev => ({
        ...prev,
        error: 'Este navegador no puede procesar audio. Usá Chrome, Firefox, Safari o Edge actualizados.',
      }))
      return
    }

    if (!isGetUserMediaSupported()) {
      setState(prev => ({
        ...prev,
        error: 'Este navegador no permite usar el micrófono.',
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
          error: 'El audio quedó en pausa. Tocá "Activar micrófono" para seguir afinando.',
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
    // Already listening. A suspended context (the phone paused the page's
    // audio) is not listening, so it falls through and the graph is rebuilt.
    if (state.isActive && audioContextRef.current?.state === 'running') return
    // An auto-start and a tap can overlap: share the request in flight.
    if (startingRef.current) return startingRef.current

    // Check compatibility before starting
    if (!isWebAudioAPISupported() || !isGetUserMediaSupported()) {
      setState(prev => ({
        ...prev,
        isRequesting: false,
        error: 'Este navegador no permite usar el micrófono.',
      }))
      return
    }

    setState(prev => ({ ...prev, isRequesting: true, error: null }))

    const run = async () => {
      let stream: MediaStream | null = null
      try {
        // Request microphone access with cross-browser compatibility
        stream = await getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        })

        streamRef.current?.getTracks().forEach(track => track.stop())
        streamRef.current = stream

        // Create or resume audio context with cross-browser compatibility
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          const newContext = createAudioContext()
          if (!newContext) {
            throw new Error('No se pudo iniciar el audio del navegador.')
          }
          audioContextRef.current = newContext
        }

        const audioContext = audioContextRef.current

        // Resume if suspended. Without a user gesture Chrome leaves resume()
        // pending instead of rejecting, so don't wait on it forever.
        if (audioContext.state === 'suspended') {
          await Promise.race([
            audioContext.resume(),
            new Promise(resolve => setTimeout(resolve, RESUME_TIMEOUT_MS)),
          ])
        }

        // Verify context is running
        if (audioContext.state !== 'running') {
          throw new AudioNeedsGestureError()
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
        // Don't leave the mic open when the audio side failed.
        stream?.getTracks().forEach(track => track.stop())
        if (streamRef.current === stream) streamRef.current = null

        const needsGesture = err instanceof AudioNeedsGestureError
        setState(prev => ({
          ...prev,
          isActive: false,
          // The mic was granted; only the audio is waiting for a tap.
          hasPermission: needsGesture,
          isRequesting: false,
          error: needsGesture ? err.message : getUserMediaErrorMessage(err),
        }))
      }
    }

    startingRef.current = run().finally(() => {
      startingRef.current = null
    })
    return startingRef.current
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
