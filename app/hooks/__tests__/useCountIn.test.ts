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

  describe('lead-in for a levare on the first line', () => {
    const hz = () => vi.mocked(synth.triggerAttackRelease).mock.calls.map((call) => call[0])

    it('counts only the beats of the levare, clicking the ones right before the downbeat', async () => {
      const onDone = vi.fn()
      const { result } = renderHook(() => useCountIn())
      await act(async () => {
        await result.current.start({ bpm: 120, beatsPerBar: 4, bars: 1, totalBeats: 2, pickupBeats: 2, onDone })
      })
      // Two clicks, counted back from the downbeat: 3 and 4 — neither is the accented 1.
      expect(synth.triggerAttackRelease).toHaveBeenCalledTimes(2)
      expect(hz()).toEqual([800, 800])
      act(() => vi.advanceTimersByTime(60))
      expect(result.current.count).toBe(3)
      act(() => vi.advanceTimersByTime(500))
      expect(result.current.count).toBe(4)
      expect(onDone).not.toHaveBeenCalled()
      // 2 beats at 500 ms, plus the 50 ms lead: the song starts on its first chord.
      act(() => vi.advanceTimersByTime(500))
      expect(onDone).toHaveBeenCalledTimes(1)
    })

    it('lights the words for the whole lead-in, and stops when the song starts', async () => {
      const { result } = renderHook(() => useCountIn())
      await act(async () => {
        await result.current.start({ bpm: 120, beatsPerBar: 4, bars: 1, totalBeats: 2, pickupBeats: 2, onDone: vi.fn() })
      })
      expect(result.current.isPickup).toBe(false)
      act(() => vi.advanceTimersByTime(60))
      expect(result.current.isPickup).toBe(true)
      act(() => vi.advanceTimersByTime(1000))
      expect(result.current.isPickup).toBe(false)
      expect(result.current.isCountingIn).toBe(false)
    })

    it('a levare of a beat and a half leaves the first half beat silent', async () => {
      const onDone = vi.fn()
      const { result } = renderHook(() => useCountIn())
      await act(async () => {
        await result.current.start({ bpm: 120, beatsPerBar: 4, bars: 1, totalBeats: 1.5, pickupBeats: 1.5, onDone })
      })
      expect(synth.triggerAttackRelease).toHaveBeenCalledTimes(1)
      expect(result.current.isPickup).toBe(false)
      act(() => vi.advanceTimersByTime(60))
      expect(result.current.isPickup).toBe(true) // the words start at once…
      expect(result.current.count).toBeNull() // …before the click, half a beat later
      act(() => vi.advanceTimersByTime(500))
      expect(result.current.count).toBe(4)
      act(() => vi.advanceTimersByTime(250))
      expect(onDone).toHaveBeenCalledTimes(1)
    })

    it('with the count-in on, only the last beats of it are the levare', async () => {
      const onDone = vi.fn()
      const { result } = renderHook(() => useCountIn())
      await act(async () => {
        await result.current.start({ bpm: 120, beatsPerBar: 4, bars: 1, pickupBeats: 2, onDone })
      })
      expect(synth.triggerAttackRelease).toHaveBeenCalledTimes(4)
      act(() => vi.advanceTimersByTime(1000)) // beats 1 and 2 of the count
      expect(result.current.isPickup).toBe(false)
      act(() => vi.advanceTimersByTime(60)) // beat 3 begins: "This happened once be-"
      expect(result.current.isPickup).toBe(true)
      act(() => vi.advanceTimersByTime(1000))
      expect(onDone).toHaveBeenCalledTimes(1)
      expect(result.current.isPickup).toBe(false)
    })

    it('a lead-in as long as a bar still accents its first click', async () => {
      const { result } = renderHook(() => useCountIn())
      await act(async () => {
        await result.current.start({ bpm: 120, beatsPerBar: 4, bars: 1, totalBeats: 4, onDone: vi.fn() })
      })
      expect(hz()).toEqual([1200, 800, 800, 800])
    })

    it('never lights the words when the song has no levare, and cancel puts them out', async () => {
      const { result } = renderHook(() => useCountIn())
      await act(async () => {
        await result.current.start({ bpm: 120, beatsPerBar: 4, bars: 1, onDone: vi.fn() })
      })
      act(() => vi.advanceTimersByTime(1500))
      expect(result.current.isPickup).toBe(false)

      await act(async () => {
        await result.current.start({ bpm: 120, beatsPerBar: 4, bars: 1, totalBeats: 2, pickupBeats: 2, onDone: vi.fn() })
      })
      act(() => vi.advanceTimersByTime(100))
      expect(result.current.isPickup).toBe(true)
      act(() => result.current.cancel())
      expect(result.current.isPickup).toBe(false)
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
