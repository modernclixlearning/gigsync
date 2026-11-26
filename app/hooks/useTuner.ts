import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useMicrophone } from './useMicrophone'
import type { TunerState, PitchInfo, TuningPreset, CalibrationSettings } from '~/types/tuner'
import { DEFAULT_CALIBRATION } from '~/types/tuner'
import { createPitchStabilizer, type StablePitch } from '~/lib/tuner/pitchStabilizer'

export interface UseTunerReturn extends TunerState {
  /** Microphone access is being requested */
  isRequesting: boolean
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

/** The detector runs about 30 times a second: plenty for a needle, and half the work. */
const DETECT_INTERVAL_MS = 30
/** Lowest pitch looked for (Hz) — below a bass's low B. Bounds how far YIN searches. */
const MIN_FREQUENCY = 30

/**
 * Loudness (RMS) under which nothing is tuned: only digital silence and the
 * floor of the converter — about -64 dBFS. It must stay this low: a guitar
 * picked up by a phone's microphone can be very quiet, and the detector
 * already rejects noise by itself (noise never reaches a confident pitch), so
 * a higher gate would only hide real notes. Higher sensitivity lowers it a bit.
 */
export function noiseGate(sensitivity: number): number {
  return 0.0003 + (1 - Math.min(1, Math.max(0, sensitivity))) * 0.0006
}

export function rootMeanSquare(buffer: Float32Array): number {
  let sum = 0
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i]
  return Math.sqrt(sum / buffer.length)
}

/** Whether what is on screen would look any different with `next`. */
function sameOnScreen(previous: PitchInfo | null, next: StablePitch | null): boolean {
  if (!previous || !next) return previous === next
  return (
    previous.note === next.note &&
    previous.octave === next.octave &&
    previous.cents === next.cents &&
    Math.abs(previous.frequency - next.frequency) < 0.05
  )
}

/**
 * YIN pitch detection algorithm implementation
 * Returns the detected fundamental frequency in Hz
 */
export function detectPitch(
  buffer: Float32Array, 
  sampleRate: number,
  sensitivity: number = 0.5
): { frequency: number; confidence: number } | null {
  const bufferSize = buffer.length
  const yinThreshold = 0.1 + (1 - sensitivity) * 0.3 // 0.1 to 0.4 based on sensitivity
  
  // Step 1: Calculate the difference function. The window is half the buffer;
  // only lags down to the lowest pitch looked for are searched.
  const windowSize = bufferSize / 2
  const yinBuffer = new Float32Array(Math.min(windowSize, Math.ceil(sampleRate / MIN_FREQUENCY) + 1))
  
  for (let tau = 0; tau < yinBuffer.length; tau++) {
    yinBuffer[tau] = 0
    for (let i = 0; i < windowSize; i++) {
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
  const stabilizer = useMemo(() => createPitchStabilizer(), [])

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
          ? 'El audio quedó en pausa. Tocá "Activar micrófono" para seguir afinando.'
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
    stabilizer.reset()
    let lastDetection = -Infinity

    const detectLoop = (frameTime: number = performance.now()) => {
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
            ? 'El audio quedó en pausa. Tocá "Activar micrófono" para seguir afinando.'
            : null,
        }))
        return
      }

      // A needle does not need 60 readings a second: about 30, and the rest of the frames are skipped.
      if (frameTime - lastDetection < DETECT_INTERVAL_MS) {
        animationFrameRef.current = requestAnimationFrame(detectLoop)
        return
      }
      lastDetection = frameTime

      // Get time domain data
      analyser.getFloatTimeDomainData(bufferRef.current as Float32Array<ArrayBuffer>)

      const { sensitivity, referenceFrequency } = calibrationRef.current
      // Too quiet to be a note: nothing is tuned (and the stabilizer lets the last reading fade).
      const detected =
        rootMeanSquare(bufferRef.current) < noiseGate(sensitivity)
          ? null
          : detectPitch(bufferRef.current, sampleRate, sensitivity)

      // The stabilizer decides what the screen shows; only a visible change re-renders.
      const stable = stabilizer.push(detected, frameTime, referenceFrequency)
      setState(prev =>
        sameOnScreen(prev.pitch, stable)
          ? prev
          : { ...prev, pitch: stable ? { ...stable } : null }
      )

      animationFrameRef.current = requestAnimationFrame(detectLoop)
    }

    detectLoop()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [microphone.isActive, microphone.analyser, microphone.sampleRate, microphone.audioContext, calibration, stabilizer])

  const start = useCallback(async () => {
    await microphone.start()
  }, [microphone])

  const stop = useCallback(() => {
    microphone.stop()
    stabilizer.reset()
    setState(prev => ({ ...prev, isListening: false, pitch: null }))
  }, [microphone, stabilizer])

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
    isRequesting: microphone.isRequesting,
    start,
    stop,
    toggle,
    setCalibration,
    setPreset,
  }
}
