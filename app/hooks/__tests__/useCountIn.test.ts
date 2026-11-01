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
