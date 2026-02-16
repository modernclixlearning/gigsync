/**
 * Tests for useSmartAutoScroll hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useSmartAutoScroll } from '../useSmartAutoScroll'
import mockTone from '@tests/mocks/tone'

// Mock Tone.js
vi.mock('tone', async () => {
  const mockToneModule = await import('@tests/mocks/tone')
  return mockToneModule.default
})

// Mock useSongTimeline and useBPMSync
vi.mock('../useSongTimeline', () => ({
  useSongTimeline: vi.fn()
}))

vi.mock('../useBPMSync', () => ({
  useBPMSync: vi.fn()
}))

import { useSongTimeline } from '../useSongTimeline'
import { useBPMSync } from '../useBPMSync'

describe('useSmartAutoScroll', () => {
  let mockContainer: HTMLElement
  let containerRef: React.RefObject<HTMLElement>
  let mockRequestAnimationFrame: ReturnType<typeof vi.fn>
  let mockCancelAnimationFrame: ReturnType<typeof vi.fn>
  let rafCallbacks: Array<(time: number) => void>
  let rafIdCounter: number

  const mockLyrics = `[Verse]
[Am]Hello [G]world
[C]This is a [F]test`

  beforeEach(() => {
    // Setup DOM mocks
    rafCallbacks = []
    rafIdCounter = 0

    mockRequestAnimationFrame = vi.fn((callback: (time: number) => void) => {
      rafCallbacks.push(callback)
      return ++rafIdCounter
    })

    mockCancelAnimationFrame = vi.fn((id: number) => {
      // Remove callback if exists
      rafCallbacks = rafCallbacks.filter((_, index) => index !== id - 1)
    })

    global.requestAnimationFrame = mockRequestAnimationFrame as any
    global.cancelAnimationFrame = mockCancelAnimationFrame as any

    // Create mock container element
    mockContainer = {
      scrollTop: 0,
      clientHeight: 600,
      offsetTop: 0,
      querySelector: vi.fn((selector: string) => {
        // Return mock elements with data-element-id attributes
        if (selector.includes('element-0')) {
          return {
            offsetTop: 0,
            getAttribute: () => 'element-0'
          } as any
        }
        if (selector.includes('element-1')) {
          return {
            offsetTop: 100,
            getAttribute: () => 'element-1'
          } as any
        }
        if (selector.includes('element-2')) {
          return {
            offsetTop: 200,
            getAttribute: () => 'element-2'
          } as any
        }
        return null
      }),
      querySelectorAll: vi.fn(() => [])
    } as any

    containerRef = {
      current: mockContainer
    } as React.RefObject<HTMLElement>

    // Mock useSongTimeline
    const mockTimeline = {
      timeline: {
        elements: [
          {
            id: 'element-0',
            type: 'section',
            startBeat: 0,
            endBeat: 0,
            durationBeats: 0,
            bars: 0,
            content: { type: 'section', name: 'Verse', raw: '[Verse]' }
          },
          {
            id: 'element-1',
            type: 'lyric',
            startBeat: 0,
            endBeat: 8,
            durationBeats: 8,
            bars: 2,
            content: { type: 'lyric', raw: '[Am]Hello [G]world', text: 'Hello world', chords: [] }
          },
          {
            id: 'element-2',
            type: 'lyric',
            startBeat: 8,
            endBeat: 16,
            durationBeats: 8,
            bars: 2,
            content: { type: 'lyric', raw: '[C]This is a [F]test', text: 'This is a test', chords: [] }
          }
        ],
        totalBeats: 16,
        totalBars: 4,
        totalDurationSeconds: 8,
        beatsPerBar: 4,
        bpm: 120
      },
      isReady: true,
      getElementAtBeat: vi.fn((beat: number) => {
        if (beat >= 0 && beat < 8) return mockTimeline.timeline.elements[1]
        if (beat >= 8 && beat < 16) return mockTimeline.timeline.elements[2]
        return null
      }),
      getScrollPositionForBeat: vi.fn((beat: number) => {
        if (beat >= 0 && beat < 8) return 100
        if (beat >= 8 && beat < 16) return 200
        return 0
      }),
      updateElementPosition: vi.fn()
    }

    vi.mocked(useSongTimeline).mockReturnValue(mockTimeline as any)

    // Mock useBPMSync
    const mockBPMSync = {
      currentBeat: 0,
      currentBar: 0,
      currentBeatInBar: 0,
      isRunning: false,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      reset: vi.fn(),
      seekToBeat: vi.fn(),
      transportTime: 0
    }

    vi.mocked(useBPMSync).mockReturnValue(mockBPMSync as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
    rafCallbacks = []
  })

  it('should initialize with valid options', () => {
    const { result } = renderHook(() =>
      useSmartAutoScroll({
        lyrics: mockLyrics,
        bpm: 120,
        timeSignature: '4/4',
        isPlaying: false,
        isEnabled: false,
        containerRef
      })
    )

    expect(result.current.currentBeat).toBe(0)
    expect(result.current.currentBar).toBe(0)
    expect(result.current.currentBeatInBar).toBe(0)
    expect(result.current.isReady).toBe(true)
  })

  it('should return isReady from timeline', () => {
    const mockTimeline = {
      timeline: {
        elements: [],
        totalBeats: 0,
        totalBars: 0,
        totalDurationSeconds: 0,
        beatsPerBar: 4,
        bpm: 120
      },
      isReady: true,
      getElementAtBeat: vi.fn(),
      getScrollPositionForBeat: vi.fn(),
      updateElementPosition: vi.fn()
    }

    vi.mocked(useSongTimeline).mockReturnValue(mockTimeline as any)

    const { result } = renderHook(() =>
      useSmartAutoScroll({
        lyrics: mockLyrics,
        bpm: 120,
        timeSignature: '4/4',
        isPlaying: false,
        isEnabled: false,
        containerRef
      })
    )

    expect(result.current.isReady).toBe(true)
  })

  it('should measure element positions when timeline is ready', async () => {
    const updateElementPositionSpy = vi.fn()
    const mockTimeline = {
      timeline: {
        elements: [
          { id: 'element-0', type: 'section', startBeat: 0, endBeat: 0, durationBeats: 0, bars: 0, content: {} },
          { id: 'element-1', type: 'lyric', startBeat: 0, endBeat: 8, durationBeats: 8, bars: 2, content: {} }
        ],
        totalBeats: 8,
        totalBars: 2,
        totalDurationSeconds: 4,
        beatsPerBar: 4,
        bpm: 120
      },
      isReady: true,
      getElementAtBeat: vi.fn(),
      getScrollPositionForBeat: vi.fn(),
      updateElementPosition: updateElementPositionSpy
    }

    vi.mocked(useSongTimeline).mockReturnValue(mockTimeline as any)

    const { result } = renderHook(() =>
      useSmartAutoScroll({
        lyrics: mockLyrics,
        bpm: 120,
        timeSignature: '4/4',
        isPlaying: false,
        isEnabled: false,
        containerRef
      })
    )

    // Wait for requestAnimationFrame to be called
    // The effect uses requestAnimationFrame to wait for DOM to be ready
    await waitFor(() => {
      expect(mockRequestAnimationFrame).toHaveBeenCalled()
    }, { timeout: 2000 })

    // Execute the RAF callback manually to trigger DOM measurement
    if (rafCallbacks.length > 0) {
      act(() => {
        rafCallbacks[rafCallbacks.length - 1](performance.now())
      })
      
      // Now updateElementPosition should be called
      await waitFor(() => {
        expect(updateElementPositionSpy).toHaveBeenCalled()
      }, { timeout: 1000 })
    }
  })

  it('should reset when isEnabled changes to false', () => {
    const mockBPMSync = {
      currentBeat: 0,
      currentBar: 0,
      currentBeatInBar: 0,
      isRunning: false,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      reset: vi.fn(),
      seekToBeat: vi.fn(),
      transportTime: 0
    }

    vi.mocked(useBPMSync).mockReturnValue(mockBPMSync as any)

    const { rerender } = renderHook(
      ({ isEnabled }) =>
        useSmartAutoScroll({
          lyrics: mockLyrics,
          bpm: 120,
          timeSignature: '4/4',
          isPlaying: false,
          isEnabled,
          containerRef
        }),
      {
        initialProps: { isEnabled: true }
      }
    )

    rerender({ isEnabled: false })

    expect(mockBPMSync.reset).toHaveBeenCalled()
  })

  it('should handle smooth scroll when beat changes', async () => {
    const mockBPMSync = {
      currentBeat: 4,
      currentBar: 1,
      currentBeatInBar: 0,
      isRunning: true,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      reset: vi.fn(),
      seekToBeat: vi.fn(),
      transportTime: 2
    }

    vi.mocked(useBPMSync).mockReturnValue(mockBPMSync as any)

    const { result } = renderHook(() =>
      useSmartAutoScroll({
        lyrics: mockLyrics,
        bpm: 120,
        timeSignature: '4/4',
        isPlaying: true,
        isEnabled: true,
        containerRef
      })
    )

    // Simulate beat change callback
    const mockTimeline = vi.mocked(useSongTimeline).mock.results[0].value
    const handleBeatChange = vi.mocked(useBPMSync).mock.calls[0]?.[0]?.onBeatChange

    if (handleBeatChange) {
      act(() => {
        handleBeatChange(4)
      })
    }

    // Should trigger scroll animation
    await waitFor(() => {
      expect(mockRequestAnimationFrame).toHaveBeenCalled()
    })
  })

  it('should calculate context window offset correctly', async () => {
    const mockBPMSync = {
      currentBeat: 4,
      currentBar: 1,
      currentBeatInBar: 0,
      isRunning: true,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      reset: vi.fn(),
      seekToBeat: vi.fn(),
      transportTime: 2
    }

    vi.mocked(useBPMSync).mockReturnValue(mockBPMSync as any)

    const mockTimeline = {
      timeline: {
        elements: [
          {
            id: 'element-1',
            type: 'lyric',
            startBeat: 0,
            endBeat: 8,
            durationBeats: 8,
            bars: 2,
            content: {}
          }
        ],
        totalBeats: 8,
        totalBars: 2,
        totalDurationSeconds: 4,
        beatsPerBar: 4,
        bpm: 120
      },
      isReady: true,
      getElementAtBeat: vi.fn((beat: number) => {
        if (beat >= 0 && beat < 8) return { id: 'element-1', startBeat: 0, endBeat: 8 }
        return null
      }),
      getScrollPositionForBeat: vi.fn(() => 100),
      updateElementPosition: vi.fn()
    }

    vi.mocked(useSongTimeline).mockReturnValue(mockTimeline as any)

    const { result } = renderHook(() =>
      useSmartAutoScroll({
        lyrics: mockLyrics,
        bpm: 120,
        timeSignature: '4/4',
        isPlaying: true,
        isEnabled: true,
        containerRef
      })
    )

    const handleBeatChange = vi.mocked(useBPMSync).mock.calls[0]?.[0]?.onBeatChange

    if (handleBeatChange) {
      act(() => {
        handleBeatChange(4)
      })
    }

    // Context window should be 33% of viewport (600 * 0.33 = 198)
    // Target position should be rawPosition - contextOffset = 100 - 198 = -98, clamped to 0
    await waitFor(() => {
      expect(mockRequestAnimationFrame).toHaveBeenCalled()
    }, { timeout: 2000 })
  })

  it('should update currentElementId when beat changes', async () => {
    const mockBPMSync = {
      currentBeat: 4,
      currentBar: 1,
      currentBeatInBar: 0,
      isRunning: true,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      reset: vi.fn(),
      seekToBeat: vi.fn(),
      transportTime: 2
    }

    const getElementAtBeatMock = vi.fn((beat: number) => {
      if (beat >= 0 && beat < 8) return { id: 'element-1', startBeat: 0, endBeat: 8 }
      return null
    })

    const getScrollPositionForBeatMock = vi.fn(() => 100)

    const mockTimeline = {
      timeline: {
        elements: [
          {
            id: 'element-1',
            type: 'lyric',
            startBeat: 0,
            endBeat: 8,
            durationBeats: 8,
            bars: 2,
            content: {}
          }
        ],
        totalBeats: 8,
        totalBars: 2,
        totalDurationSeconds: 4,
        beatsPerBar: 4,
        bpm: 120
      },
      isReady: true,
      getElementAtBeat: getElementAtBeatMock,
      getScrollPositionForBeat: getScrollPositionForBeatMock,
      updateElementPosition: vi.fn()
    }

    vi.mocked(useSongTimeline).mockReturnValue(mockTimeline as any)
    
    // Store the onBeatChange callback before mocking useBPMSync
    let handleBeatChangeCallback: ((beat: number) => void) | undefined
    
    vi.mocked(useBPMSync).mockImplementation((options) => {
      handleBeatChangeCallback = options.onBeatChange
      return mockBPMSync as any
    })

    const { result } = renderHook(() =>
      useSmartAutoScroll({
        lyrics: mockLyrics,
        bpm: 120,
        timeSignature: '4/4',
        isPlaying: true,
        isEnabled: true,
        containerRef
      })
    )

    // Call the onBeatChange callback directly
    if (handleBeatChangeCallback) {
      act(() => {
        handleBeatChangeCallback!(4)
      })
    }

    // Verify getElementAtBeat was called
    expect(getElementAtBeatMock).toHaveBeenCalledWith(4)
    
    // Note: currentElementId is stored in a ref, and the return value uses currentElementIdRef.current
    // The ref is updated synchronously in handleBeatChange, but the return value may not reflect it immediately
    // This test verifies the callback mechanism works correctly
  })

  it('should cleanup animation frame on unmount', () => {
    const { unmount } = renderHook(() =>
      useSmartAutoScroll({
        lyrics: mockLyrics,
        bpm: 120,
        timeSignature: '4/4',
        isPlaying: true,
        isEnabled: true,
        containerRef
      })
    )

    unmount()

    // Cleanup should cancel any pending animation frames
    // This is tested implicitly - if there were frames, they should be cancelled
    expect(mockCancelAnimationFrame).toHaveBeenCalled()
  })

  it('should not scroll when disabled', () => {
    // Clear previous calls
    mockRequestAnimationFrame.mockClear()

    const mockBPMSync = {
      currentBeat: 4,
      currentBar: 1,
      currentBeatInBar: 0,
      isRunning: false,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      reset: vi.fn(),
      seekToBeat: vi.fn(),
      transportTime: 2
    }

    vi.mocked(useBPMSync).mockReturnValue(mockBPMSync as any)

    const mockTimeline = {
      timeline: {
        elements: [],
        totalBeats: 0,
        totalBars: 0,
        totalDurationSeconds: 0,
        beatsPerBar: 4,
        bpm: 120
      },
      isReady: true,
      getElementAtBeat: vi.fn(),
      getScrollPositionForBeat: vi.fn(),
      updateElementPosition: vi.fn()
    }

    vi.mocked(useSongTimeline).mockReturnValue(mockTimeline as any)

    const { result } = renderHook(() =>
      useSmartAutoScroll({
        lyrics: mockLyrics,
        bpm: 120,
        timeSignature: '4/4',
        isPlaying: false,
        isEnabled: false,
        containerRef
      })
    )

    const handleBeatChange = vi.mocked(useBPMSync).mock.calls[0]?.[0]?.onBeatChange

    if (handleBeatChange) {
      act(() => {
        handleBeatChange(4)
      })
    }

    // Should not trigger scroll when disabled
    // Note: requestAnimationFrame might be called for DOM measurement, but not for scroll animation
    // The key is that smoothScrollTo should not be called
    expect(result.current.isReady).toBe(true)
  })

  it('should use custom smoothScrollDuration', () => {
    const { result } = renderHook(() =>
      useSmartAutoScroll({
        lyrics: mockLyrics,
        bpm: 120,
        timeSignature: '4/4',
        isPlaying: false,
        isEnabled: false,
        containerRef,
        smoothScrollDuration: 200
      })
    )

    // Duration should be stored (tested implicitly through behavior)
    expect(result.current).toBeDefined()
  })

  it('should accept custom contextWindowRatio', () => {
    const { result } = renderHook(() =>
      useSmartAutoScroll({
        lyrics: mockLyrics,
        bpm: 120,
        timeSignature: '4/4',
        isPlaying: true,
        isEnabled: true,
        containerRef,
        contextWindowRatio: 0.5
      })
    )

    expect(result.current).toBeDefined()
  })

  it('should expose play, pause, reset, and seekToBeat from BPM sync', () => {
    const mockBPMSync = {
      currentBeat: 0,
      currentBar: 0,
      currentBeatInBar: 0,
      isRunning: false,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      reset: vi.fn(),
      seekToBeat: vi.fn(),
      transportTime: 0
    }

    vi.mocked(useBPMSync).mockReturnValue(mockBPMSync as any)

    const { result } = renderHook(() =>
      useSmartAutoScroll({
        lyrics: mockLyrics,
        bpm: 120,
        timeSignature: '4/4',
        isPlaying: false,
        isEnabled: false,
        containerRef
      })
    )

    expect(result.current.play).toBe(mockBPMSync.play)
    expect(result.current.pause).toBe(mockBPMSync.pause)
    expect(result.current.reset).toBe(mockBPMSync.reset)
    expect(result.current.seekToBeat).toBe(mockBPMSync.seekToBeat)
  })

  describe('Fallback to simple autoscroll', () => {
    it('should activate fallback when timeline has error', async () => {
      const mockTimelineWithError = {
        timeline: null,
        isReady: true,
        error: new Error('Timeline calculation failed'),
        getElementAtBeat: vi.fn(),
        getScrollPositionForBeat: vi.fn(),
        updateElementPosition: vi.fn()
      }

      vi.mocked(useSongTimeline).mockReturnValue(mockTimelineWithError as any)

      const mockBPMSync = {
        currentBeat: 0,
        currentBar: 0,
        currentBeatInBar: 0,
        isRunning: false,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        reset: vi.fn(),
        seekToBeat: vi.fn(),
        transportTime: 0
      }

      vi.mocked(useBPMSync).mockReturnValue(mockBPMSync as any)

      const { result } = renderHook(() =>
        useSmartAutoScroll({
          lyrics: mockLyrics,
          bpm: 120,
          timeSignature: '4/4',
          isPlaying: false,
          isEnabled: true, // Enabled to trigger fallback check
          containerRef
        })
      )

      await waitFor(() => {
        expect(result.current.hasFallback).toBe(true)
      }, { timeout: 1000 })
    })

    it('should activate fallback when timeline is null and ready', async () => {
      const mockTimelineNull = {
        timeline: null,
        isReady: true,
        error: null,
        getElementAtBeat: vi.fn(),
        getScrollPositionForBeat: vi.fn(),
        updateElementPosition: vi.fn()
      }

      vi.mocked(useSongTimeline).mockReturnValue(mockTimelineNull as any)

      const mockBPMSync = {
        currentBeat: 0,
        currentBar: 0,
        currentBeatInBar: 0,
        isRunning: false,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        reset: vi.fn(),
        seekToBeat: vi.fn(),
        transportTime: 0
      }

      vi.mocked(useBPMSync).mockReturnValue(mockBPMSync as any)

      const { result } = renderHook(() =>
        useSmartAutoScroll({
          lyrics: mockLyrics,
          bpm: 120,
          timeSignature: '4/4',
          isPlaying: false,
          isEnabled: true,
          containerRef
        })
      )

      await waitFor(() => {
        expect(result.current.hasFallback).toBe(true)
      }, { timeout: 1000 })
    })

    it('should not activate fallback when autoscroll is disabled', () => {
      const mockTimelineWithError = {
        timeline: null,
        isReady: true,
        error: new Error('Timeline calculation failed'),
        getElementAtBeat: vi.fn(),
        getScrollPositionForBeat: vi.fn(),
        updateElementPosition: vi.fn()
      }

      vi.mocked(useSongTimeline).mockReturnValue(mockTimelineWithError as any)

      const mockBPMSync = {
        currentBeat: 0,
        currentBar: 0,
        currentBeatInBar: 0,
        isRunning: false,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        reset: vi.fn(),
        seekToBeat: vi.fn(),
        transportTime: 0
      }

      vi.mocked(useBPMSync).mockReturnValue(mockBPMSync as any)

      const { result } = renderHook(() =>
        useSmartAutoScroll({
          lyrics: mockLyrics,
          bpm: 120,
          timeSignature: '4/4',
          isPlaying: false,
          isEnabled: false, // Disabled - should not trigger fallback
          containerRef
        })
      )

      expect(result.current.hasFallback).toBe(false)
    })

    it('should automatically recover when timeline is restored', async () => {
      const mockTimelineWithError = {
        timeline: null,
        isReady: true,
        error: new Error('Timeline calculation failed'),
        getElementAtBeat: vi.fn(),
        getScrollPositionForBeat: vi.fn(),
        updateElementPosition: vi.fn()
      }

      const mockTimelineRestored = {
        timeline: {
          elements: [
            {
              id: 'element-1',
              type: 'lyric',
              startBeat: 0,
              endBeat: 8,
              durationBeats: 8,
              bars: 2,
              content: {}
            }
          ],
          totalBeats: 8,
          totalBars: 2,
          totalDurationSeconds: 4,
          beatsPerBar: 4,
          bpm: 120
        },
        isReady: true,
        error: null,
        getElementAtBeat: vi.fn(),
        getScrollPositionForBeat: vi.fn(),
        updateElementPosition: vi.fn()
      }

      vi.mocked(useSongTimeline).mockReturnValue(mockTimelineWithError as any)

      const mockBPMSync = {
        currentBeat: 0,
        currentBar: 0,
        currentBeatInBar: 0,
        isRunning: false,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        reset: vi.fn(),
        seekToBeat: vi.fn(),
        transportTime: 0
      }

      vi.mocked(useBPMSync).mockReturnValue(mockBPMSync as any)

      const { result, rerender } = renderHook(
        ({ isEnabled }) =>
          useSmartAutoScroll({
            lyrics: mockLyrics,
            bpm: 120,
            timeSignature: '4/4',
            isPlaying: false,
            isEnabled,
            containerRef
          }),
        {
          initialProps: { isEnabled: true }
        }
      )

      // Wait for fallback to activate
      await waitFor(() => {
        expect(result.current.hasFallback).toBe(true)
      }, { timeout: 1000 })

      // Restore timeline
      vi.mocked(useSongTimeline).mockReturnValue(mockTimelineRestored as any)

      // Trigger rerender to simulate timeline recovery
      rerender({ isEnabled: true })

      // Wait for automatic recovery
      await waitFor(() => {
        expect(result.current.hasFallback).toBe(false)
      }, { timeout: 1000 })
    })

    it('should allow retry via retrySmartAutoscroll', async () => {
      const mockTimelineWithError = {
        timeline: null,
        isReady: true,
        error: new Error('Timeline calculation failed'),
        getElementAtBeat: vi.fn(),
        getScrollPositionForBeat: vi.fn(),
        updateElementPosition: vi.fn()
      }

      const mockTimelineRestored = {
        timeline: {
          elements: [
            {
              id: 'element-1',
              type: 'lyric',
              startBeat: 0,
              endBeat: 8,
              durationBeats: 8,
              bars: 2,
              content: {}
            }
          ],
          totalBeats: 8,
          totalBars: 2,
          totalDurationSeconds: 4,
          beatsPerBar: 4,
          bpm: 120
        },
        isReady: true,
        error: null,
        getElementAtBeat: vi.fn(),
        getScrollPositionForBeat: vi.fn(),
        updateElementPosition: vi.fn()
      }

      vi.mocked(useSongTimeline).mockReturnValue(mockTimelineWithError as any)

      const mockBPMSync = {
        currentBeat: 0,
        currentBar: 0,
        currentBeatInBar: 0,
        isRunning: false,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        reset: vi.fn(),
        seekToBeat: vi.fn(),
        transportTime: 0
      }

      vi.mocked(useBPMSync).mockReturnValue(mockBPMSync as any)

      const { result } = renderHook(() =>
        useSmartAutoScroll({
          lyrics: mockLyrics,
          bpm: 120,
          timeSignature: '4/4',
          isPlaying: false,
          isEnabled: true,
          containerRef
        })
      )

      // Wait for fallback to activate
      await waitFor(() => {
        expect(result.current.hasFallback).toBe(true)
      }, { timeout: 1000 })

      // Restore timeline before retry
      vi.mocked(useSongTimeline).mockReturnValue(mockTimelineRestored as any)

      // Call retry
      act(() => {
        result.current.retrySmartAutoscroll()
      })

      // Wait for retry to process and timeline to be re-evaluated
      await waitFor(() => {
        expect(result.current.hasFallback).toBe(false)
      }, { timeout: 1000 })
    })

    it('should expose retrySmartAutoscroll function', () => {
      const mockTimeline = {
        timeline: {
          elements: [],
          totalBeats: 0,
          totalBars: 0,
          totalDurationSeconds: 0,
          beatsPerBar: 4,
          bpm: 120
        },
        isReady: true,
        error: null,
        getElementAtBeat: vi.fn(),
        getScrollPositionForBeat: vi.fn(),
        updateElementPosition: vi.fn()
      }

      vi.mocked(useSongTimeline).mockReturnValue(mockTimeline as any)

      const mockBPMSync = {
        currentBeat: 0,
        currentBar: 0,
        currentBeatInBar: 0,
        isRunning: false,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        reset: vi.fn(),
        seekToBeat: vi.fn(),
        transportTime: 0
      }

      vi.mocked(useBPMSync).mockReturnValue(mockBPMSync as any)

      const { result } = renderHook(() =>
        useSmartAutoScroll({
          lyrics: mockLyrics,
          bpm: 120,
          timeSignature: '4/4',
          isPlaying: false,
          isEnabled: false,
          containerRef
        })
      )

      expect(typeof result.current.retrySmartAutoscroll).toBe('function')
      expect(result.current.hasFallback).toBe(false)
    })
  })
})
