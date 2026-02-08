import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTapTempo } from '../useTapTempo'

describe('useTapTempo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with empty taps and null BPM', () => {
    const { result } = renderHook(() => useTapTempo())

    expect(result.current.taps).toEqual([])
    expect(result.current.calculatedBpm).toBe(null)
  })

  it('should calculate BPM with multiple taps', async () => {
    const { result } = renderHook(() => useTapTempo())

    // Simulate taps at 120 BPM (500ms intervals)
    act(() => {
      result.current.tap()
    })
    vi.advanceTimersByTime(500)

    act(() => {
      result.current.tap()
    })
    vi.advanceTimersByTime(500)

    act(() => {
      result.current.tap()
    })

    await waitFor(() => {
      expect(result.current.taps.length).toBeGreaterThanOrEqual(2)
      expect(result.current.calculatedBpm).toBeCloseTo(120, 0)
    })
  })

  it('should require minimum 2 taps to calculate BPM', () => {
    const { result } = renderHook(() => useTapTempo())

    act(() => {
      result.current.tap()
    })

    expect(result.current.calculatedBpm).toBe(null)
  })

  it('should reset taps after timeout', async () => {
    const { result } = renderHook(() => useTapTempo())

    act(() => {
      result.current.tap()
    })
    vi.advanceTimersByTime(500)

    act(() => {
      result.current.tap()
    })

    await waitFor(() => {
      expect(result.current.taps.length).toBe(2)
    })

    // Wait for timeout (2000ms)
    vi.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(result.current.taps).toEqual([])
      expect(result.current.calculatedBpm).toBe(null)
    })
  })

  it('should clamp BPM to 20-300 range', async () => {
    const { result } = renderHook(() => useTapTempo())

    // Very slow taps (should clamp to 20)
    act(() => {
      result.current.tap()
    })
    vi.advanceTimersByTime(5000) // 5 seconds = 12 BPM

    act(() => {
      result.current.tap()
    })

    await waitFor(() => {
      expect(result.current.calculatedBpm).toBeGreaterThanOrEqual(20)
    })

    // Very fast taps (should clamp to 300)
    act(() => {
      result.current.tap()
    })
    vi.advanceTimersByTime(100) // 100ms = 600 BPM

    act(() => {
      result.current.tap()
    })

    await waitFor(() => {
      expect(result.current.calculatedBpm).toBeLessThanOrEqual(300)
    })
  })

  it('should keep only last 8 taps', async () => {
    const { result } = renderHook(() => useTapTempo())

    // Add 10 taps
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.tap()
      })
      vi.advanceTimersByTime(500)
    }

    await waitFor(() => {
      expect(result.current.taps.length).toBeLessThanOrEqual(8)
    })
  })

  it('should reset taps when last tap was too long ago', async () => {
    const { result } = renderHook(() => useTapTempo())

    act(() => {
      result.current.tap()
    })
    vi.advanceTimersByTime(500)

    act(() => {
      result.current.tap()
    })

    await waitFor(() => {
      expect(result.current.taps.length).toBe(2)
    })

    // Wait more than TAP_TIMEOUT (2000ms)
    vi.advanceTimersByTime(2500)

    act(() => {
      result.current.tap()
    })

    await waitFor(() => {
      // Should reset and start new sequence
      expect(result.current.taps.length).toBe(1)
    })
  })

  it('should reset manually', async () => {
    const { result } = renderHook(() => useTapTempo())

    act(() => {
      result.current.tap()
    })
    vi.advanceTimersByTime(500)

    act(() => {
      result.current.tap()
    })

    await waitFor(() => {
      expect(result.current.taps.length).toBe(2)
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.taps).toEqual([])
    expect(result.current.calculatedBpm).toBe(null)
  })
})
