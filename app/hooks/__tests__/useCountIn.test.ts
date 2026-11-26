import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import mockTone, { MockSynth } from '@tests/mocks/tone'
import { useCountIn } from '../useCountIn'

vi.mock('tone', async () => {
  const mockToneModule = await import('@tests/mocks/tone')
  return mockToneModule.default
})

describe('useCountIn', () => {
  let synth: MockSynth

  beforeEach(() => {
    vi.useFakeTimers()
    synth = new MockSynth()
    vi.mocked(mockTone.Synth).mockImplementation(() => synth as never)
    vi.mocked(mockTone.start).mockResolvedValue(undefined)
    // Audio clock frozen at 0: every delay is measured from the start.
    vi.mocked(mockTone.now).mockReturnValue(0)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('clicks one bar at the song tempo, accent first, then starts the song on the downbeat', async () => {
    const onDone = vi.fn()
    const { result } = renderHook(() => useCountIn())

    await act(async () => {
      await result.current.start({ bpm: 120, beatsPerBar: 4, bars: 1, onDone })
    })
    expect(result.current.isCountingIn).toBe(true)
    expect(synth.triggerAttackRelease).toHaveBeenCalledTimes(4)
    const [firstHz] = vi.mocked(synth.triggerAttackRelease).mock.calls[0]
    const [secondHz] = vi.mocked(synth.triggerAttackRelease).mock.calls[1]
    expect(firstHz).toBeGreaterThan(secondHz as number)

    // 120 BPM → a beat every 500 ms (plus the 50 ms lead).
    act(() => vi.advanceTimersByTime(60))
    expect(result.current.count).toBe(1)
    act(() => vi.advanceTimersByTime(1500))
    expect(result.current.count).toBe(4)
    expect(onDone).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(500))
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(result.current.count).toBeNull()
    expect(result.current.isCountingIn).toBe(false)
  })

  describe('levare on the first line', () => {
    const hz = () => vi.mocked(synth.triggerAttackRelease).mock.calls.map((call) => call[0])

    it('counts the whole bar, but only clicks the beats before the levare: 3 and 4 are silent', async () => {
      const onDone = vi.fn()
      const { result } = renderHook(() => useCountIn())
      await act(async () => {
        await result.current.start({ bpm: 120, beatsPerBar: 4, bars: 1, pickupBeats: 2, onDone })
      })
      // Beats 1 (accent) and 2 sound; 3 and 4, where the voice sings alone, do not.
      expect(hz()).toEqual([1200, 800])

      // …but all four are counted on screen.
      act(() => vi.advanceTimersByTime(60))
      expect(result.current.count).toBe(1)
      act(() => vi.advanceTimersByTime(500))
      expect(result.current.count).toBe(2)
      act(() => vi.advanceTimersByTime(500))
      expect(result.current.count).toBe(3)
      act(() => vi.advanceTimersByTime(500))
      expect(result.current.count).toBe(4)
      expect(onDone).not.toHaveBeenCalled()
      // The song starts on its first chord, right after the fourth beat.
      act(() => vi.advanceTimersByTime(500))
      expect(onDone).toHaveBeenCalledTimes(1)
    })

    it('lights the words only for the silent beats, and stops when the song starts', async () => {
      const { result } = renderHook(() => useCountIn())
      await act(async () => {
        await result.current.start({ bpm: 120, beatsPerBar: 4, bars: 1, pickupBeats: 2, onDone: vi.fn() })
      })
      act(() => vi.advanceTimersByTime(60)) // beat 1 (the count starts 50 ms in)
      expect(result.current.isPickup).toBe(false)
      act(() => vi.advanceTimersByTime(980)) // 1040 ms: still on beat 2
      expect(result.current.isPickup).toBe(false)
      act(() => vi.advanceTimersByTime(20)) // 1060 ms: beat 3 begins, "This happened once be-"
      expect(result.current.isPickup).toBe(true)
      act(() => vi.advanceTimersByTime(1000))
      expect(result.current.isPickup).toBe(false)
      expect(result.current.isCountingIn).toBe(false)
    })

    it('a levare of a beat and a half silences the beat inside it, not the one before', async () => {
      const { result } = renderHook(() => useCountIn())
      await act(async () => {
        await result.current.start({ bpm: 120, beatsPerBar: 4, bars: 1, pickupBeats: 1.5, onDone: vi.fn() })
      })
      // The words start half way through beat 3: beats 1, 2 and 3 click, only 4 is silent.
      expect(hz()).toEqual([1200, 800, 800])
      act(() => vi.advanceTimersByTime(1060)) // 2.5 beats
      expect(result.current.isPickup).toBe(false)
      act(() => vi.advanceTimersByTime(250))
      expect(result.current.isPickup).toBe(true)
    })

    it('with a longer count-in, only the last beats of the last bar are silent', async () => {
      const onDone = vi.fn()
      const { result } = renderHook(() => useCountIn())
      await act(async () => {
        await result.current.start({ bpm: 120, beatsPerBar: 4, bars: 2, pickupBeats: 2, onDone })
      })
      expect(hz()).toEqual([1200, 800, 800, 800, 1200, 800])
      act(() => vi.advanceTimersByTime(3000)) // six beats counted: nothing is lit yet
      expect(result.current.isPickup).toBe(false)
      act(() => vi.advanceTimersByTime(100)) // beat 7 begins
      expect(result.current.isPickup).toBe(true)
      act(() => vi.advanceTimersByTime(1000))
      expect(onDone).toHaveBeenCalledTimes(1)
    })

    it('a levare longer than the bar stretches the count to whole bars, all of it silent from the start of its bar', async () => {
      const { result } = renderHook(() => useCountIn())
      await act(async () => {
        await result.current.start({ bpm: 120, beatsPerBar: 4, bars: 1, pickupBeats: 6, onDone: vi.fn() })
      })
      // Two bars (8 beats); the last 6 are silent, so only beats 1 and 2 of the first bar click.
      expect(hz()).toEqual([1200, 800])
    })

    it('a levare as long as the bar is counted in silence', async () => {
      const { result } = renderHook(() => useCountIn())
      await act(async () => {
        await result.current.start({ bpm: 120, beatsPerBar: 4, bars: 1, pickupBeats: 4, onDone: vi.fn() })
      })
      expect(synth.triggerAttackRelease).not.toHaveBeenCalled()
      act(() => vi.advanceTimersByTime(60))
      expect(result.current.count).toBe(1)
      expect(result.current.isPickup).toBe(true)
    })

    it('without a levare every beat clicks and the words are never lit; cancel puts them out', async () => {
      const { result } = renderHook(() => useCountIn())
      await act(async () => {
        await result.current.start({ bpm: 120, beatsPerBar: 4, bars: 1, onDone: vi.fn() })
      })
      expect(hz()).toEqual([1200, 800, 800, 800])
      act(() => vi.advanceTimersByTime(1500))
      expect(result.current.isPickup).toBe(false)

      await act(async () => {
        await result.current.start({ bpm: 120, beatsPerBar: 4, bars: 1, pickupBeats: 2, onDone: vi.fn() })
      })
      act(() => vi.advanceTimersByTime(1100))
      expect(result.current.isPickup).toBe(true)
      act(() => result.current.cancel())
      expect(result.current.isPickup).toBe(false)
    })
  })

  describe('compound meters', () => {
    const run = async (timeSignature: string, beatsPerBar: number, bars = 1) => {
      const { result } = renderHook(() => useCountIn())
      await act(async () => {
        await result.current.start({ bpm: 120, beatsPerBar, timeSignature, bars, onDone: vi.fn() })
      })
      const counted: (number | null)[] = []
      for (let i = 0; i < beatsPerBar * bars; i++) {
        act(() => vi.advanceTimersByTime(i === 0 ? 60 : 500))
        counted.push(result.current.count)
      }
      return counted
    }

    it('counts a 6/8 bar "1 2 3 1 2 3" and accents the 1st and the 4th click', async () => {
      const counted = await run('6/8', 6)
      expect(counted).toEqual([1, 2, 3, 1, 2, 3])
      const calls = vi.mocked(synth.triggerAttackRelease).mock.calls
      expect(calls.map((call) => call[0])).toEqual([1200, 800, 800, 1200, 800, 800])
      expect(calls.map((call) => call[3])).toEqual([1, 1, 1, 0.75, 1, 1])
    })

    it('counts a 12/8 bar in four groups of three', async () => {
      expect(await run('12/8', 12)).toEqual([1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3])
      expect(vi.mocked(synth.triggerAttackRelease).mock.calls.map((call) => call[0] === 1200)).toEqual(
        [true, false, false, true, false, false, true, false, false, true, false, false],
      )
    })

    it('keeps counting a simple meter through the bar, accent on the first click only', async () => {
      expect(await run('7/8', 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
      expect(vi.mocked(synth.triggerAttackRelease).mock.calls.filter((call) => call[0] === 1200)).toHaveLength(1)
    })
  })

  it('clicks at the volume it is given (the player passes its metronome volume)', async () => {
    const { result } = renderHook(() => useCountIn())
    await act(async () => {
      await result.current.start({ bpm: 120, beatsPerBar: 4, bars: 1, volume: 0.1, onDone: vi.fn() })
    })
    expect(synth.volume.value).toBeCloseTo(-20, 1)
  })

  it('cancel stops the count and never starts the song', async () => {
    const onDone = vi.fn()
    const { result } = renderHook(() => useCountIn())
    await act(async () => {
      await result.current.start({ bpm: 120, beatsPerBar: 4, bars: 1, onDone })
    })
    act(() => vi.advanceTimersByTime(600))
    act(() => result.current.cancel())
    act(() => vi.advanceTimersByTime(5000))
    expect(onDone).not.toHaveBeenCalled()
    expect(result.current.isCountingIn).toBe(false)
    expect(synth.dispose).toHaveBeenCalled()
  })
})
