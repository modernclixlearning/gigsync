import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTuner, detectPitch, noiseGate, rootMeanSquare } from '../useTuner'
import { useMicrophone } from '../useMicrophone'
import { MockAudioContext, MockMediaStream } from '@tests/mocks/webAudio'
import { DEFAULT_CALIBRATION } from '~/types/tuner'

// Mock useMicrophone
vi.mock('../useMicrophone', () => ({
  useMicrophone: vi.fn(),
}))

describe('useTuner', () => {
  let mockMicrophone: ReturnType<typeof useMicrophone>
  let mockAudioContext: MockAudioContext
  let mockAnalyser: AnalyserNode

  beforeEach(() => {
    mockAudioContext = new MockAudioContext()
    mockAnalyser = mockAudioContext.createAnalyser()

    mockMicrophone = {
      isActive: false,
      hasPermission: false,
      isRequesting: false,
      error: null,
      sampleRate: 44100,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      toggle: vi.fn().mockResolvedValue(undefined),
      analyser: null,
      audioContext: null,
    }

    vi.mocked(useMicrophone).mockReturnValue(mockMicrophone)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useTuner())

    expect(result.current.isListening).toBe(false)
    expect(result.current.hasPermission).toBe(false)
    expect(result.current.pitch).toBe(null)
    expect(result.current.calibration).toEqual(DEFAULT_CALIBRATION)
    expect(result.current.preset).toBe(null)
    expect(result.current.error).toBe(null)
  })

  it('should update state based on microphone state', () => {
    mockMicrophone.hasPermission = true
    mockMicrophone.error = null

    const { result } = renderHook(() => useTuner())

    expect(result.current.hasPermission).toBe(true)
    expect(result.current.error).toBe(null)
  })

  it('should not start listening if microphone is not active', () => {
    mockMicrophone.isActive = false

    const { result } = renderHook(() => useTuner())

    expect(result.current.isListening).toBe(false)
    expect(result.current.pitch).toBe(null)
  })

  it('should start listening when microphone becomes active', async () => {
    mockMicrophone.isActive = true
    mockMicrophone.analyser = mockAnalyser
    mockMicrophone.audioContext = mockAudioContext as any
    mockMicrophone.sampleRate = 44100

    // Update mock return value
    vi.mocked(useMicrophone).mockReturnValue(mockMicrophone)

    const { result } = renderHook(() => useTuner())

    await waitFor(() => {
      expect(result.current.isListening).toBe(true)
    }, { timeout: 3000 })
  })

  it('should detect pitch with valid frequency', async () => {
    mockMicrophone.isActive = true
    mockAnalyser = mockAudioContext.createAnalyser()
    mockMicrophone.analyser = mockAnalyser
    mockMicrophone.audioContext = mockAudioContext as any
    mockMicrophone.sampleRate = 44100

    // Update mock return value
    vi.mocked(useMicrophone).mockReturnValue(mockMicrophone)

    // Mock analyser to return data representing 440Hz (A4)
    const mockBuffer = new Float32Array(4096)
    for (let i = 0; i < mockBuffer.length; i++) {
      mockBuffer[i] = Math.sin(2 * Math.PI * 440 * (i / 44100))
    }
    vi.mocked(mockAnalyser.getFloatTimeDomainData).mockImplementation((array) => {
      array.set(mockBuffer)
    })

    const { result } = renderHook(() => useTuner())

    await waitFor(() => {
      expect(result.current.isListening).toBe(true)
    }, { timeout: 3000 })
  })

  it('locks onto the note heard and holds it steady', async () => {
    mockMicrophone.isActive = true
    mockAnalyser = mockAudioContext.createAnalyser()
    mockMicrophone.analyser = mockAnalyser
    mockMicrophone.audioContext = mockAudioContext as any
    mockMicrophone.sampleRate = 44100
    vi.mocked(useMicrophone).mockReturnValue(mockMicrophone)

    // A 440 Hz tone with a little frame-to-frame wobble in its pitch (±2 Hz).
    let frame = 0
    vi.mocked(mockAnalyser.getFloatTimeDomainData).mockImplementation((array) => {
      const hz = 440 + (frame++ % 2 === 0 ? 2 : -2)
      for (let i = 0; i < array.length; i++) array[i] = 0.5 * Math.sin(2 * Math.PI * hz * (i / 44100))
    })

    const { result } = renderHook(() => useTuner())

    await waitFor(() => {
      expect(result.current.pitch?.note).toBe('A')
    }, { timeout: 3000 })
    expect(result.current.pitch?.octave).toBe(4)

    // After settling, the wobble no longer moves the needle by more than a few cents.
    const seen: number[] = []
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      if (result.current.pitch) seen.push(result.current.pitch.cents)
    }
    expect(seen.length).toBeGreaterThan(0)
    expect(Math.max(...seen) - Math.min(...seen)).toBeLessThanOrEqual(8)
  })

  it('tunes a note played quietly: a guitar picked up low by a phone microphone', async () => {
    mockMicrophone.isActive = true
    mockAnalyser = mockAudioContext.createAnalyser()
    mockMicrophone.analyser = mockAnalyser
    mockMicrophone.audioContext = mockAudioContext as any
    mockMicrophone.sampleRate = 44100
    vi.mocked(useMicrophone).mockReturnValue(mockMicrophone)

    // Peak amplitude 0.008 (RMS ~0.0057, about -45 dBFS): what a gate set at 0.008 used to throw away.
    vi.mocked(mockAnalyser.getFloatTimeDomainData).mockImplementation((array) => {
      for (let i = 0; i < array.length; i++) array[i] = 0.008 * Math.sin(2 * Math.PI * 110 * (i / 44100))
    })

    const { result } = renderHook(() => useTuner())
    await waitFor(() => {
      expect(result.current.pitch?.note).toBe('A')
    }, { timeout: 3000 })
    expect(result.current.pitch?.octave).toBe(2)
  })

  it('does not tune digital silence level signals', async () => {
    mockMicrophone.isActive = true
    mockAnalyser = mockAudioContext.createAnalyser()
    mockMicrophone.analyser = mockAnalyser
    mockMicrophone.audioContext = mockAudioContext as any
    mockMicrophone.sampleRate = 44100
    vi.mocked(useMicrophone).mockReturnValue(mockMicrophone)

    // A clean 440 Hz tone, but at the floor of the converter: -75 dBFS.
    vi.mocked(mockAnalyser.getFloatTimeDomainData).mockImplementation((array) => {
      for (let i = 0; i < array.length; i++) array[i] = 0.0002 * Math.sin(2 * Math.PI * 440 * (i / 44100))
    })

    const { result } = renderHook(() => useTuner())
    await waitFor(() => expect(result.current.isListening).toBe(true), { timeout: 3000 })
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(result.current.pitch).toBe(null)
  })

  it('should handle calibration changes', () => {
    const { result } = renderHook(() => useTuner())

    act(() => {
      result.current.setCalibration({ referenceFrequency: 442 })
    })

    expect(result.current.calibration.referenceFrequency).toBe(442)
    expect(result.current.calibration.sensitivity).toBe(DEFAULT_CALIBRATION.sensitivity)
  })

  it('should handle sensitivity changes', () => {
    const { result } = renderHook(() => useTuner())

    act(() => {
      result.current.setCalibration({ sensitivity: 0.8 })
    })

    expect(result.current.calibration.sensitivity).toBe(0.8)
  })

  it('should set tuning preset', () => {
    const { result } = renderHook(() => useTuner())

    const preset = {
      id: 'guitar-standard',
      name: 'Standard',
      instrument: 'guitar' as const,
      notes: [
        { note: 'E' as const, octave: 2 },
        { note: 'A' as const, octave: 2 },
        { note: 'D' as const, octave: 3 },
        { note: 'G' as const, octave: 3 },
        { note: 'B' as const, octave: 3 },
        { note: 'E' as const, octave: 4 },
      ],
    }

    act(() => {
      result.current.setPreset(preset)
    })

    expect(result.current.preset).toEqual(preset)
  })

  it('should clear preset when set to null', () => {
    const { result } = renderHook(() => useTuner())

    const preset = {
      id: 'guitar-standard',
      name: 'Standard',
      instrument: 'guitar' as const,
      notes: [
        { note: 'E' as const, octave: 2 },
        { note: 'A' as const, octave: 2 },
        { note: 'D' as const, octave: 3 },
        { note: 'G' as const, octave: 3 },
        { note: 'B' as const, octave: 3 },
        { note: 'E' as const, octave: 4 },
      ],
    }

    act(() => {
      result.current.setPreset(preset)
      result.current.setPreset(null)
    })

    expect(result.current.preset).toBe(null)
  })

  it('should start microphone when start is called', async () => {
    const { result } = renderHook(() => useTuner())

    await act(async () => {
      await result.current.start()
    })

    expect(mockMicrophone.start).toHaveBeenCalled()
  })

  it('should stop microphone when stop is called', () => {
    const { result } = renderHook(() => useTuner())

    act(() => {
      result.current.stop()
    })

    expect(mockMicrophone.stop).toHaveBeenCalled()
    expect(result.current.isListening).toBe(false)
    expect(result.current.pitch).toBe(null)
  })

  it('should toggle listening', async () => {
    mockMicrophone.isActive = false
    vi.mocked(useMicrophone).mockReturnValue(mockMicrophone)
    const { result, rerender } = renderHook(() => useTuner())

    await act(async () => {
      await result.current.toggle()
    })

    expect(mockMicrophone.start).toHaveBeenCalled()

    mockMicrophone.isActive = true
    mockMicrophone.analyser = mockAnalyser
    mockMicrophone.audioContext = mockAudioContext as any
    vi.mocked(useMicrophone).mockReturnValue(mockMicrophone)
    
    rerender()

    await waitFor(() => {
      expect(result.current.isListening).toBe(true)
    })

    await act(async () => {
      await result.current.toggle()
    })

    expect(mockMicrophone.stop).toHaveBeenCalled()
  })

  it('should handle AudioContext suspended state', async () => {
    mockMicrophone.isActive = true
    mockMicrophone.analyser = mockAnalyser
    mockAudioContext.state = 'suspended'
    mockMicrophone.audioContext = mockAudioContext as any
    vi.mocked(useMicrophone).mockReturnValue(mockMicrophone)

    const { result } = renderHook(() => useTuner())

    await waitFor(() => {
      expect(result.current.error).toContain('en pausa')
    }, { timeout: 3000 })
  })

  it('should clear pitch when no confident detection', async () => {
    mockMicrophone.isActive = true
    mockAnalyser = mockAudioContext.createAnalyser()
    mockMicrophone.analyser = mockAnalyser
    mockMicrophone.audioContext = mockAudioContext as any
    vi.mocked(useMicrophone).mockReturnValue(mockMicrophone)

    // Mock analyser to return silence (all zeros)
    const silentBuffer = new Float32Array(4096).fill(0)
    vi.mocked(mockAnalyser.getFloatTimeDomainData).mockImplementation((array) => {
      array.set(silentBuffer)
    })

    const { result } = renderHook(() => useTuner())

    await waitFor(() => {
      expect(result.current.isListening).toBe(true)
    }, { timeout: 3000 })

    // Pitch should be null for silence
    await waitFor(() => {
      expect(result.current.pitch).toBe(null)
    }, { timeout: 3000 })
  })

  it('should filter out frequencies outside valid range', async () => {
    mockMicrophone.isActive = true
    mockAnalyser = mockAudioContext.createAnalyser()
    mockMicrophone.analyser = mockAnalyser
    mockMicrophone.audioContext = mockAudioContext as any
    vi.mocked(useMicrophone).mockReturnValue(mockMicrophone)

    // Mock analyser to return very low frequency (below 20Hz)
    const lowFreqBuffer = new Float32Array(4096)
    for (let i = 0; i < lowFreqBuffer.length; i++) {
      lowFreqBuffer[i] = Math.sin(2 * Math.PI * 10 * (i / 44100))
    }
    vi.mocked(mockAnalyser.getFloatTimeDomainData).mockImplementation((array) => {
      array.set(lowFreqBuffer)
    })

    const { result } = renderHook(() => useTuner())

    await waitFor(() => {
      expect(result.current.isListening).toBe(true)
    }, { timeout: 3000 })

    // Should not detect pitch for frequencies outside range
    await waitFor(() => {
      // Pitch should be null or not set
      expect(result.current.pitch).toBe(null)
    }, { timeout: 3000 })
  })
})

describe('detectPitch', () => {
  /** A plucked-string-like tone: eight harmonics, a bit of inharmonicity, decaying, over a noise floor. */
  function pluck(freq: number, sampleRate: number, peak: number, noise: number): Float32Array {
    const out = new Float32Array(4096)
    let seed = 1
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1
    for (let i = 0; i < out.length; i++) {
      const t = 0.15 + i / sampleRate
      let v = 0
      for (let h = 1; h <= 8; h++) v += Math.sin(2 * Math.PI * freq * h * (1 + 0.0004 * h * h) * t) / h ** 1.2
      out[i] = (v * peak * Math.exp(-t * 1.2)) / 2 + rand() * noise
    }
    return out
  }
  const cents = (found: number, expected: number) => Math.abs(1200 * Math.log2(found / expected))

  it('finds a plucked string at any level a microphone gives, from loud to very quiet', () => {
    for (const sampleRate of [44100, 48000]) {
      for (const [expected, freq] of [[82.41, 82.41], [110, 110], [329.63, 329.63]] as const) {
        for (const peak of [0.5, 0.1, 0.03, 0.01]) {
          const result = detectPitch(pluck(freq, sampleRate, peak, 0.0005), sampleRate, 0.5)
          expect(result, `${freq} Hz at ${peak} (${sampleRate} Hz)`).not.toBeNull()
          expect(result!.confidence).toBeGreaterThan(0.9)
          expect(cents(result!.frequency, expected)).toBeLessThan(30)
        }
      }
    }
  })

  it('never takes noise for a note: it finds no pitch in white noise or room rumble', () => {
    let seed = 7
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1
    for (const amplitude of [0.002, 0.01, 0.05]) {
      for (let k = 0; k < 20; k++) {
        const white = new Float32Array(4096)
        const rumble = new Float32Array(4096)
        let low = 0
        for (let i = 0; i < white.length; i++) {
          white[i] = rand() * amplitude
          low += 0.05 * (rand() - low)
          rumble[i] = low * 4 * amplitude
        }
        expect(detectPitch(white, 44100, 0.5)).toBeNull()
        expect(detectPitch(rumble, 44100, 0.5)).toBeNull()
      }
    }
  })

  it('the gate only keeps out the floor of the converter: a quiet guitar is far above it', () => {
    const quiet = pluck(110, 44100, 0.01, 0.0005)
    expect(rootMeanSquare(quiet)).toBeGreaterThan(noiseGate(0.5) * 5)
    expect(noiseGate(0.5)).toBeLessThan(0.001)
    expect(noiseGate(1)).toBeLessThan(noiseGate(0))
  })
})
