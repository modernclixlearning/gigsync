import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMetronome } from '../useMetronome'
import mockTone, { MockSynth, MockTransport, MockLoop } from '@tests/mocks/tone'

// Mock Tone.js
vi.mock('tone', async () => {
  const mockToneModule = await import('@tests/mocks/tone')
  return mockToneModule.default
})

describe('useMetronome', () => {
  let mockSynth: MockSynth
  let mockTransport: MockTransport

  beforeEach(() => {
    mockSynth = new MockSynth()
    mockTransport = new MockTransport()
    
    vi.mocked(mockTone.Transport.get).mockReturnValue(mockTransport as any)
    vi.mocked(mockTone.getTransport).mockReturnValue(mockTransport as any)
    vi.mocked(mockTone.start).mockResolvedValue(undefined)
    vi.mocked(mockTone.Synth).mockImplementation(() => mockSynth as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default BPM', () => {
    const { result } = renderHook(() => useMetronome())

    expect(result.current.bpm).toBe(120)
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.currentBeat).toBe(0)
    expect(result.current.timeSignature).toBe('4/4')
    expect(result.current.sound).toBe('classic')
    expect(result.current.volume).toBe(0.8)
    expect(result.current.accentFirst).toBe(true)
    expect(result.current.subdivisions).toBe(false)
  })

  it('should initialize with custom BPM', () => {
    const { result } = renderHook(() => useMetronome(140))

    expect(result.current.bpm).toBe(140)
  })

  it('should change BPM', async () => {
    const { result } = renderHook(() => useMetronome())

    act(() => {
      result.current.setBpm(150)
    })

    expect(result.current.bpm).toBe(150)
    
    // Wait for useEffect to update transport BPM
    await waitFor(() => {
      expect(mockTransport.bpm.value).toBe(150)
    })
  })

  it('should clamp BPM to valid range (20-300)', () => {
    const { result } = renderHook(() => useMetronome())

    act(() => {
      result.current.setBpm(10) // Below minimum
    })
    expect(result.current.bpm).toBe(20)

    act(() => {
      result.current.setBpm(400) // Above maximum
    })
    expect(result.current.bpm).toBe(300)
  })

  it('should start metronome', async () => {
    const { result } = renderHook(() => useMetronome())

    await act(async () => {
      await result.current.start()
    })

    await waitFor(() => {
      expect(result.current.isPlaying).toBe(true)
      expect(mockTransport.start).toHaveBeenCalled()
      expect(mockTone.start).toHaveBeenCalled()
    })
  })

  it('should stop metronome', async () => {
    const { result } = renderHook(() => useMetronome())

    await act(async () => {
      await result.current.start()
    })

    await waitFor(() => {
      expect(result.current.isPlaying).toBe(true)
    })

    act(() => {
      result.current.stop()
    })

    expect(result.current.isPlaying).toBe(false)
    expect(result.current.currentBeat).toBe(0)
    expect(mockTransport.stop).toHaveBeenCalled()
  })

  it('should toggle metronome', async () => {
    const { result } = renderHook(() => useMetronome())

    await act(async () => {
      await result.current.toggle()
    })

    await waitFor(() => {
      expect(result.current.isPlaying).toBe(true)
    })

    act(() => {
      result.current.toggle()
    })

    expect(result.current.isPlaying).toBe(false)
  })

  it('should change time signature', () => {
    const { result } = renderHook(() => useMetronome())

    act(() => {
      result.current.setTimeSignature('3/4')
    })

    expect(result.current.timeSignature).toBe('3/4')
  })

  it('should change sound', () => {
    const { result } = renderHook(() => useMetronome())

    act(() => {
      result.current.setSound('woodblock')
    })

    expect(result.current.sound).toBe('woodblock')
    expect(result.current.error).toBe(null)
  })

  it('should change volume', () => {
    const { result } = renderHook(() => useMetronome())

    act(() => {
      result.current.setVolume(0.5)
    })

    expect(result.current.volume).toBe(0.5)
    expect(mockSynth.volume.value).toBe(mockTone.gainToDb(0.5))
  })

  it('should clamp volume to 0-1 range', () => {
    const { result } = renderHook(() => useMetronome())

    act(() => {
      result.current.setVolume(-0.5) // Below minimum
    })
    expect(result.current.volume).toBe(0)

    act(() => {
      result.current.setVolume(1.5) // Above maximum
    })
    expect(result.current.volume).toBe(1)
  })

  it('should toggle accent first beat', () => {
    const { result } = renderHook(() => useMetronome())

    act(() => {
      result.current.setAccentFirst(false)
    })

    expect(result.current.accentFirst).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('should toggle subdivisions', () => {
    const { result } = renderHook(() => useMetronome())

    act(() => {
      result.current.toggleSubdivisions()
    })

    expect(result.current.subdivisions).toBe(true)
    expect(result.current.error).toBe(null)

    act(() => {
      result.current.toggleSubdivisions()
    })

    expect(result.current.subdivisions).toBe(false)
  })

  it('should handle Tone.js initialization error', () => {
    vi.mocked(mockTone.Synth).mockImplementation(() => {
      throw new Error('Failed to initialize')
    })

    const { result } = renderHook(() => useMetronome())

    expect(result.current.error).toContain('Failed to initialize')
  })

  it('should handle Tone.js start error', async () => {
    vi.mocked(mockTone.start).mockRejectedValue(new Error('Audio context error'))

    const { result } = renderHook(() => useMetronome())

    await act(async () => {
      await result.current.start()
    })

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
      expect(result.current.isPlaying).toBe(false)
    })
  })

  it('should handle suspended Tone context', async () => {
    mockTone.context.state = 'suspended'
    vi.mocked(mockTone.context.resume).mockResolvedValue(undefined)

    const { result } = renderHook(() => useMetronome())

    await act(async () => {
      await result.current.start()
    })

    expect(mockTone.context.resume).toHaveBeenCalled()
  })

  it('should update BPM when state changes', async () => {
    const { result } = renderHook(() => useMetronome())

    await waitFor(() => {
      // Wait for initialization
      expect(mockTone.Synth).toHaveBeenCalled()
    })

    act(() => {
      result.current.setBpm(100)
    })

    // Wait for useEffect to update transport BPM
    await waitFor(() => {
      expect(mockTransport.bpm.value).toBe(100)
    }, { timeout: 2000 })
  })

  it('should cleanup on unmount', async () => {
    const { result, unmount } = renderHook(() => useMetronome())

    await act(async () => {
      await result.current.start()
    })

    const disposeSpy = vi.spyOn(mockSynth, 'dispose')

    unmount()

    expect(disposeSpy).toHaveBeenCalled()
  })
})
