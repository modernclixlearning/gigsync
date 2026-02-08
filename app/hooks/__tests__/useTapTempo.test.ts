import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTapTempo } from '../useTapTempo'

describe('useTapTempo', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with empty taps and null BPM', () => {
    const { result } = renderHook(() => useTapTempo())

    expect(result.current.taps).toEqual([])
    expect(result.current.calculatedBpm).toBe(null)
  })

  it('should calculate BPM with multiple taps', () => {
    const { result } = renderHook(() => useTapTempo())

    // Simulate taps at 120 BPM (500ms intervals)
    act(() => {
      result.current.tap()
    })
    
    act(() => {
      vi.advanceTimersByTime(500)
      result.current.tap()
    })
    
    act(() => {
      vi.advanceTimersByTime(500)
      result.current.tap()
    })

    expect(result.current.taps.length).toBeGreaterThanOrEqual(2)
    expect(result.current.calculatedBpm).toBeCloseTo(120, 0)
  })

  it('should require minimum 2 taps to calculate BPM', () => {
    const { result } = renderHook(() => useTapTempo())

    act(() => {
      result.current.tap()
    })

    expect(result.current.calculatedBpm).toBe(null)
  })

  it('should reset taps after timeout', () => {
    const { result } = renderHook(() => useTapTempo())

    act(() => {
      result.current.tap()
    })
    
    act(() => {
      vi.advanceTimersByTime(500)
      result.current.tap()
    })

    expect(result.current.taps.length).toBe(2)

    // Wait for timeout (2000ms)
    act(() => {
      vi.advanceTimersByTime(2100)
    })

    expect(result.current.taps).toEqual([])
    expect(result.current.calculatedBpm).toBe(null)
  })

  it('should clamp BPM to 20-300 range', () => {
    const { result } = renderHook(() => useTapTempo())

    // Reset and test very fast taps (should clamp to 300)
    act(() => {
      result.current.reset()
    })
    
    act(() => {
      result.current.tap()
    })
    
    act(() => {
      vi.advanceTimersByTime(100) // 100ms = 600 BPM
      result.current.tap()
    })

    expect(result.current.calculatedBpm).toBeLessThanOrEqual(300)
  })

  it('should keep only last 8 taps', () => {
    const { result } = renderHook(() => useTapTempo())

    // Add 10 taps
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.tap()
        vi.advanceTimersByTime(300)
      })
    }

    expect(result.current.taps.length).toBeLessThanOrEqual(8)
  })

  it('should reset taps when last tap was too long ago', () => {
    const { result } = renderHook(() => useTapTempo())

    act(() => {
      result.current.tap()
    })
    
    act(() => {
      vi.advanceTimersByTime(500)
      result.current.tap()
    })

    expect(result.current.taps.length).toBe(2)

    // Wait more than TAP_TIMEOUT (2000ms) then tap again
    act(() => {
      vi.advanceTimersByTime(2500)
      result.current.tap()
    })

    // Should reset and start new sequence
    expect(result.current.taps.length).toBe(1)
  })

  it('should reset manually', () => {
    const { result } = renderHook(() => useTapTempo())

    act(() => {
      result.current.tap()
    })
    
    act(() => {
      vi.advanceTimersByTime(500)
      result.current.tap()
    })

    expect(result.current.taps.length).toBe(2)

    act(() => {
      result.current.reset()
    })

    expect(result.current.taps).toEqual([])
    expect(result.current.calculatedBpm).toBe(null)
  })
})
