import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMetronome } from '../useMetronome'
import mockTone, { MockSynth, MockTransport, clocks } from '@tests/mocks/tone'

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
    clocks.length = 0
    
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

    // Playing, the clock follows the tempo: one tick per beat.
    await act(async () => {
      await result.current.start()
    })
    act(() => {
      result.current.setBpm(90)
    })
    await waitFor(() => {
      expect(clocks[clocks.length - 1].frequency.value).toBe(90 / 60)
    })
  })

  it('should start at the tempo and meter it is given', () => {
    const { result } = renderHook(() => useMetronome(96, '6/8'))

    expect(result.current.bpm).toBe(96)
    expect(result.current.timeSignature).toBe('6/8')
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
      expect(mockTone.start).toHaveBeenCalled()
    })
    // It ticks on its own clock, at the tempo.
    expect(clocks).toHaveLength(1)
    expect(clocks[0].start).toHaveBeenCalled()
    expect(clocks[0].frequency.value).toBe(120 / 60)
  })

  it('should never touch the shared transport, so a song can keep its place and tempo', async () => {
    const { result } = renderHook(() => useMetronome(100))
    mockTransport.bpm.value = 80 // the song's tempo

    await act(async () => {
      await result.current.start()
    })
    act(() => {
      result.current.setBpm(140)
    })
    act(() => {
      result.current.stop()
    })

    expect(mockTransport.start).not.toHaveBeenCalled()
    expect(mockTransport.stop).not.toHaveBeenCalled()
    expect(mockTransport.bpm.value).toBe(80)
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
    expect(clocks[0].stop).toHaveBeenCalled()
    expect(clocks[0].dispose).toHaveBeenCalled()
  })

  describe('the clicks', () => {
    const play = async (result: { current: ReturnType<typeof useMetronome> }) => {
      await act(async () => {
        await result.current.start()
      })
      return clocks[clocks.length - 1]
    }
    const clicked = () => mockSynth.triggerAttackRelease.mock.calls.map((call) => call[0])

    it('accents the first beat of the bar and cycles through the meter', async () => {
      const { result } = renderHook(() => useMetronome(120, '3/4'))
      const clock = await play(result)
      act(() => {
        for (let i = 0; i < 6; i++) clock.tick(i * 0.5)
      })
      expect(clicked()).toEqual([1200, 800, 800, 1200, 800, 800])
    })

    it('shows the beat being played', async () => {
      const { result } = renderHook(() => useMetronome(120, '4/4'))
      const clock = await play(result)
      act(() => clock.tick(0))
      expect(result.current.currentBeat).toBe(1)
      act(() => clock.tick(0.5))
      act(() => clock.tick(1))
      expect(result.current.currentBeat).toBe(3)
    })

    it('with subdivisions ticks twice per beat and shows the beat, not the half', async () => {
      const { result } = renderHook(() => useMetronome(120, '4/4'))
      act(() => result.current.toggleSubdivisions())
      const clock = await play(result)
      expect(clock.frequency.value).toBe((120 / 60) * 2)
      act(() => {
        for (let i = 0; i < 3; i++) clock.tick(i * 0.25)
      })
      expect(clicked().length).toBe(3)
      expect(result.current.currentBeat).toBe(2)
    })

    it('does not accent when accenting is off, and does not click when silent', async () => {
      const { result } = renderHook(() => useMetronome(120, '4/4'))
      act(() => result.current.setAccentFirst(false))
      const clock = await play(result)
      act(() => {
        clock.tick(0)
        clock.tick(0.5)
      })
      expect(clicked()).toEqual([800, 800])

      mockSynth.triggerAttackRelease.mockClear()
      act(() => result.current.setSound('silent'))
      act(() => clock.tick(1))
      expect(clicked()).toEqual([])
    })

    it('picks up a new meter right away: the bar starts over', async () => {
      const { result } = renderHook(() => useMetronome(120, '4/4'))
      const clock = await play(result)
      act(() => {
        clock.tick(0)
        clock.tick(0.5)
      })
      act(() => result.current.setTimeSignature('3/4'))
      mockSynth.triggerAttackRelease.mockClear()
      act(() => clock.tick(1))
      expect(clicked()).toEqual([1200])
    })
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

    expect(result.current.bpm).toBe(100)
    // And the transport is left alone.
    expect(mockTransport.bpm.value).toBe(120)
  })

  it('should cleanup on unmount', async () => {
    const { result, unmount } = renderHook(() => useMetronome())

    await act(async () => {
      await result.current.start()
    })

    const disposeSpy = vi.spyOn(mockSynth, 'dispose')

    unmount()

    expect(disposeSpy).toHaveBeenCalled()
    expect(clocks[0].stop).toHaveBeenCalled()
    expect(clocks[0].dispose).toHaveBeenCalled()
  })
})
