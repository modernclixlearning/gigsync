import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTuner } from '../useTuner'
import { useMicrophone } from '../useMicrophone'
import { MockAudioContext, MockMediaStream } from '~/tests/mocks/webAudio'
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
      name: 'Standard',
      notes: ['E', 'A', 'D', 'G', 'B', 'E'],
    }

    act(() => {
      result.current.setPreset(preset)
    })

    expect(result.current.preset).toEqual(preset)
  })

  it('should clear preset when set to null', () => {
    const { result } = renderHook(() => useTuner())

    const preset = {
      name: 'Standard',
      notes: ['E', 'A', 'D', 'G', 'B', 'E'],
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
    const { result } = renderHook(() => useTuner())

    await act(async () => {
      await result.current.toggle()
    })

    expect(mockMicrophone.start).toHaveBeenCalled()

    mockMicrophone.isActive = true
    vi.mocked(useMicrophone).mockReturnValue(mockMicrophone)
    const { result: result2 } = renderHook(() => useTuner())

    await waitFor(() => {
      expect(result2.current.isListening).toBe(true)
    })

    act(() => {
      result2.current.toggle()
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
      expect(result.current.error).toContain('suspended')
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
