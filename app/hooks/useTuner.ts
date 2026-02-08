import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useMicrophone } from './useMicrophone'
import type { 
  TunerState, 
  PitchInfo, 
  NoteName, 
  TuningPreset, 
  CalibrationSettings 
} from '~/types/tuner'
import { DEFAULT_CALIBRATION } from '~/types/tuner'

export interface UseTunerReturn extends TunerState {
  /** Start listening for pitch */
  start: () => Promise<void>
  /** Stop listening */
  stop: () => void
  /** Toggle listening on/off */
  toggle: () => Promise<void>
  /** Set calibration settings */
  setCalibration: (settings: Partial<CalibrationSettings>) => void
  /** Set tuning preset */
  setPreset: (preset: TuningPreset | null) => void
}

// Note frequencies relative to A4 (semitones from A)
const NOTE_NAMES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/**
 * Convert frequency to note information
 */
function frequencyToNote(frequency: number, referenceFrequency: number = 440): PitchInfo | null {
  if (frequency <= 0) return null

  // Calculate semitones from A4
  const semitones = 12 * Math.log2(frequency / referenceFrequency)
  
  // Round to nearest semitone to get the note
  const roundedSemitones = Math.round(semitones)
  
  // Calculate cents deviation (-50 to +50)
  const cents = Math.round((semitones - roundedSemitones) * 100)
  
  // Calculate note index (A = 9 in our NOTE_NAMES array)
  // A4 is our reference, so semitone 0 = A
  const noteIndex = ((roundedSemitones % 12) + 12 + 9) % 12
  const note = NOTE_NAMES[noteIndex]
  
  // Calculate octave (A4 = octave 4, each 12 semitones = 1 octave)
  const octave = 4 + Math.floor((roundedSemitones + 9) / 12)
  
  return {
    frequency,
    note,
    octave,
    cents,
    confidence: 1, // Will be set by the detection algorithm
  }
}

/**
 * YIN pitch detection algorithm implementation
 * Returns the detected fundamental frequency in Hz
 */
function detectPitch(
  buffer: Float32Array, 
  sampleRate: number,
  sensitivity: number = 0.5
): { frequency: number; confidence: number } | null {
  const bufferSize = buffer.length
  const yinThreshold = 0.1 + (1 - sensitivity) * 0.3 // 0.1 to 0.4 based on sensitivity
  
  // Step 1: Calculate the difference function
  const yinBuffer = new Float32Array(bufferSize / 2)
  
  for (let tau = 0; tau < yinBuffer.length; tau++) {
    yinBuffer[tau] = 0
    for (let i = 0; i < yinBuffer.length; i++) {
      const delta = buffer[i] - buffer[i + tau]
      yinBuffer[tau] += delta * delta
    }
  }
  
  // Step 2: Cumulative mean normalized difference function
  yinBuffer[0] = 1
  let runningSum = 0
  
  for (let tau = 1; tau < yinBuffer.length; tau++) {
    runningSum += yinBuffer[tau]
    yinBuffer[tau] *= tau / runningSum
  }
  
  // Step 3: Absolute threshold
  let tauEstimate = -1
  let minVal = Infinity
  
  for (let tau = 2; tau < yinBuffer.length; tau++) {
    if (yinBuffer[tau] < yinThreshold) {
      while (tau + 1 < yinBuffer.length && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++
      }
      tauEstimate = tau
      minVal = yinBuffer[tau]
      break
    }
    if (yinBuffer[tau] < minVal) {
      minVal = yinBuffer[tau]
      tauEstimate = tau
    }
  }
  
  if (tauEstimate === -1 || minVal > 0.5) {
    return null
  }
  
  // Step 4: Parabolic interpolation
  let betterTau: number
  const x0 = tauEstimate < 1 ? tauEstimate : tauEstimate - 1
  const x2 = tauEstimate + 1 < yinBuffer.length ? tauEstimate + 1 : tauEstimate
  
  if (x0 === tauEstimate) {
    betterTau = yinBuffer[tauEstimate] <= yinBuffer[x2] ? tauEstimate : x2
  } else if (x2 === tauEstimate) {
    betterTau = yinBuffer[tauEstimate] <= yinBuffer[x0] ? tauEstimate : x0
  } else {
    const s0 = yinBuffer[x0]
    const s1 = yinBuffer[tauEstimate]
    const s2 = yinBuffer[x2]
    betterTau = tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0))
  }
  
  const frequency = sampleRate / betterTau
  const confidence = 1 - minVal
  
  // Filter out unreasonable frequencies (below 20Hz or above 5000Hz)
  if (frequency < 20 || frequency > 5000) {
    return null
  }
  
  return { frequency, confidence }
}

/**
 * Hook for chromatic tuner functionality
 * Uses Web Audio API and YIN algorithm for pitch detection
 */
export function useTuner(): UseTunerReturn {
  const microphone = useMicrophone()
  
  const [state, setState] = useState<TunerState>({
    isListening: false,
    hasPermission: false,
    pitch: null,
    calibration: DEFAULT_CALIBRATION,
    preset: null,
    error: null,
  })

  const animationFrameRef = useRef<number | null>(null)
  const bufferRef = useRef<Float32Array | null>(null)
  const calibrationRef = useRef<CalibrationSettings>(state.calibration)

  // Keep calibration ref in sync with state
  useEffect(() => {
    calibrationRef.current = state.calibration
  }, [state.calibration])

  // Memoize calibration to avoid unnecessary re-renders
  const calibration = useMemo(() => state.calibration, [
    state.calibration.referenceFrequency,
    state.calibration.sensitivity,
  ])

  // Update state based on microphone state
  useEffect(() => {
    setState(prev => ({
      ...prev,
      hasPermission: microphone.hasPermission,
      error: microphone.error,
    }))
  }, [microphone.hasPermission, microphone.error])

  // Pitch detection loop
  useEffect(() => {
    // Validate prerequisites before starting
    if (!microphone.isActive) {
      setState(prev => ({ ...prev, isListening: false, pitch: null }))
      return
    }

    const analyser = microphone.analyser
    const sampleRate = microphone.sampleRate

    // Verify analyser and sampleRate are available
    if (!analyser || !sampleRate) {
      setState(prev => ({ ...prev, isListening: false, pitch: null }))
      return
    }

    // Verify AudioContext is running
    const audioContext = microphone.audioContext
    if (!audioContext || audioContext.state !== 'running') {
      setState(prev => ({
        ...prev,
        isListening: false,
        pitch: null,
        error: audioContext?.state === 'suspended'
          ? 'Audio processing suspended. Please interact with the page to resume.'
          : null,
      }))
      return
    }

    const bufferLength = analyser.fftSize

    // Initialize buffer if needed
    if (!bufferRef.current || bufferRef.current.length !== bufferLength) {
      bufferRef.current = new Float32Array(bufferLength)
    }

    setState(prev => ({ ...prev, isListening: true, error: null }))

    const detectLoop = () => {
      // Verify analyser is still available and context is running
      if (!analyser || !bufferRef.current) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
        return
      }

      // Check AudioContext state
      if (audioContext && audioContext.state !== 'running') {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
        setState(prev => ({
          ...prev,
          isListening: false,
          pitch: null,
          error: audioContext.state === 'suspended'
            ? 'Audio processing suspended. Please interact with the page to resume.'
            : null,
        }))
        return
      }

      // Get time domain data
      analyser.getFloatTimeDomainData(bufferRef.current)

      // Detect pitch using YIN algorithm with current calibration
      const result = detectPitch(
        bufferRef.current, 
        sampleRate,
        calibrationRef.current.sensitivity
      )

      if (result && result.confidence > 0.5) {
        const noteInfo = frequencyToNote(
          result.frequency, 
          calibrationRef.current.referenceFrequency
        )
        if (noteInfo) {
          setState(prev => ({
            ...prev,
            pitch: { ...noteInfo, confidence: result.confidence },
          }))
        } else {
          setState(prev => ({ ...prev, pitch: null }))
        }
      } else {
        // Clear pitch if no confident detection
        setState(prev => ({ ...prev, pitch: null }))
      }

      animationFrameRef.current = requestAnimationFrame(detectLoop)
    }

    detectLoop()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [microphone.isActive, microphone.analyser, microphone.sampleRate, microphone.audioContext, calibration])

  const start = useCallback(async () => {
    await microphone.start()
  }, [microphone])

  const stop = useCallback(() => {
    microphone.stop()
    setState(prev => ({ ...prev, isListening: false, pitch: null }))
  }, [microphone])

  const toggle = useCallback(async () => {
    if (state.isListening) {
      stop()
    } else {
      await start()
    }
  }, [state.isListening, start, stop])

  const setCalibration = useCallback((settings: Partial<CalibrationSettings>) => {
    setState(prev => ({
      ...prev,
      calibration: { ...prev.calibration, ...settings },
    }))
  }, [])

  const setPreset = useCallback((preset: TuningPreset | null) => {
    setState(prev => ({ ...prev, preset }))
  }, [])

  return {
    ...state,
    start,
    stop,
    toggle,
    setCalibration,
    setPreset,
  }
}
