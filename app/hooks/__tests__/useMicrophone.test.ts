import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMicrophone } from '../useMicrophone'
import * as webAudioUtils from '~/lib/audio/webAudioUtils'
import { MockAudioContext, MockMediaStream, MockMediaStreamTrack, mockGetUserMedia } from '@tests/mocks/webAudio'

// Mock webAudioUtils
vi.mock('~/lib/audio/webAudioUtils', async () => {
  const actual = await vi.importActual('~/lib/audio/webAudioUtils')
  return {
    ...actual,
    isWebAudioAPISupported: vi.fn(() => true),
    isGetUserMediaSupported: vi.fn(() => true),
    createAudioContext: vi.fn(),
    getUserMedia: vi.fn(),
    getUserMediaErrorMessage: vi.fn((error: unknown) => {
      if (error instanceof Error) {
        return error.message
      }
      return 'Failed to access microphone'
    }),
  }
})

describe('useMicrophone', () => {
  let mockAudioContext: MockAudioContext
  let mockStream: MockMediaStream

  beforeEach(() => {
    vi.clearAllMocks()
    mockAudioContext = new MockAudioContext()
    mockStream = new MockMediaStream([new MockMediaStreamTrack() as unknown as MediaStreamTrack])
    
    vi.mocked(webAudioUtils.isWebAudioAPISupported).mockReturnValue(true)
    vi.mocked(webAudioUtils.isGetUserMediaSupported).mockReturnValue(true)
    vi.mocked(webAudioUtils.createAudioContext).mockReturnValue(mockAudioContext as any)
    vi.mocked(webAudioUtils.getUserMedia).mockResolvedValue(mockStream as any)
    mockGetUserMedia.mockResolvedValue(mockStream as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useMicrophone())

    expect(result.current.isActive).toBe(false)
    expect(result.current.hasPermission).toBe(false)
    expect(result.current.isRequesting).toBe(false)
    expect(result.current.error).toBe(null)
    expect(result.current.sampleRate).toBe(null)
    expect(result.current.analyser).toBe(null)
    expect(result.current.audioContext).toBe(null)
  })

  it('should check browser compatibility on mount', () => {
    vi.mocked(webAudioUtils.isWebAudioAPISupported).mockReturnValue(false)
    
    const { result } = renderHook(() => useMicrophone())

    expect(result.current.error).toContain('Web Audio API is not supported')
  })

  it('should check getUserMedia support on mount', () => {
    vi.mocked(webAudioUtils.isWebAudioAPISupported).mockReturnValue(true)
    vi.mocked(webAudioUtils.isGetUserMediaSupported).mockReturnValue(false)
    
    const { result } = renderHook(() => useMicrophone())

    expect(result.current.error).toContain('Microphone access is not supported')
  })

  it('should start microphone successfully', async () => {
    const { result } = renderHook(() => useMicrophone())

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.isActive).toBe(true)
    expect(result.current.hasPermission).toBe(true)
    expect(result.current.isRequesting).toBe(false)
    expect(result.current.error).toBe(null)
    expect(result.current.sampleRate).toBe(44100)
  })

  it('should not start if already active', async () => {
    const { result } = renderHook(() => useMicrophone())

    await act(async () => {
      await result.current.start()
    })
    
    expect(result.current.isActive).toBe(true)
    
    // Reset mock call count
    vi.mocked(webAudioUtils.getUserMedia).mockClear()

    await act(async () => {
      await result.current.start()
    })

    // Should not call getUserMedia again
    expect(webAudioUtils.getUserMedia).not.toHaveBeenCalled()
  })

  it('should stop microphone', async () => {
    const { result } = renderHook(() => useMicrophone())

    await act(async () => {
      await result.current.start()
    })
    
    expect(result.current.isActive).toBe(true)

    act(() => {
      result.current.stop()
    })

    expect(result.current.isActive).toBe(false)
  })

  it('should toggle microphone', async () => {
    const { result } = renderHook(() => useMicrophone())

    await act(async () => {
      await result.current.toggle()
    })
    
    expect(result.current.isActive).toBe(true)

    await act(async () => {
      await result.current.toggle()
    })
    
    expect(result.current.isActive).toBe(false)
  })

  it('should handle permission denied error', async () => {
    const error = new Error('Permission denied')
    error.name = 'NotAllowedError'
    vi.mocked(webAudioUtils.getUserMedia).mockRejectedValue(error)

    const { result } = renderHook(() => useMicrophone())

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.isActive).toBe(false)
    expect(result.current.hasPermission).toBe(false)
    expect(result.current.error).toBeTruthy()
  })

  it('should handle microphone not found error', async () => {
    const error = new Error('No microphone found')
    error.name = 'NotFoundError'
    vi.mocked(webAudioUtils.getUserMedia).mockRejectedValue(error)

    const { result } = renderHook(() => useMicrophone())

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.error).toBeTruthy()
  })

  it('should handle AudioContext creation failure', async () => {
    vi.mocked(webAudioUtils.createAudioContext).mockReturnValue(null)

    const { result } = renderHook(() => useMicrophone())

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.error).toBeTruthy()
  })

  it('should resume suspended AudioContext', async () => {
    const suspendedContext = new MockAudioContext()
    suspendedContext.state = 'suspended'
    const resumeSpy = vi.spyOn(suspendedContext, 'resume')
    vi.mocked(webAudioUtils.createAudioContext).mockReturnValue(suspendedContext as any)

    const { result } = renderHook(() => useMicrophone())

    await act(async () => {
      await result.current.start()
    })

    expect(resumeSpy).toHaveBeenCalled()
    expect(result.current.isActive).toBe(true)
  })

  it('should cleanup on unmount', async () => {
    const { result, unmount } = renderHook(() => useMicrophone())

    await act(async () => {
      await result.current.start()
    })
    
    expect(result.current.isActive).toBe(true)

    const track = mockStream.getTracks()[0]
    const stopTracksSpy = vi.spyOn(track, 'stop')

    unmount()

    expect(stopTracksSpy).toHaveBeenCalled()
  })

  it('should handle AudioContext state change to suspended', async () => {
    const { result } = renderHook(() => useMicrophone())

    await act(async () => {
      await result.current.start()
    })
    
    expect(result.current.isActive).toBe(true)

    // Simulate state change
    act(() => {
      mockAudioContext.state = 'suspended'
      const event = new Event('statechange')
      mockAudioContext.dispatchEvent(event)
    })

    await waitFor(() => {
      expect(result.current.error).toContain('suspended')
    })
  })
})
