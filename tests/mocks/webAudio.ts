/**
 * Mocks for Web Audio API
 */

import { vi } from 'vitest'

export class MockAudioContext {
  state: AudioContextState = 'running'
  sampleRate: number = 44100
  destination: AudioDestinationNode
  private listeners: Map<string, EventListener[]> = new Map()

  constructor() {
    this.destination = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as any
  }

  createAnalyser(): AnalyserNode {
    const analyser = {
      fftSize: 4096,
      smoothingTimeConstant: 0.8,
      frequencyBinCount: 2048,
      getFloatTimeDomainData: vi.fn((array: Float32Array) => {
        // Fill with mock data (sine wave at 440Hz)
        const sampleRate = this.sampleRate
        const frequency = 440
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.sin(2 * Math.PI * frequency * (i / sampleRate))
        }
      }),
      getByteTimeDomainData: vi.fn(),
      getFloatFrequencyData: vi.fn(),
      getByteFrequencyData: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as any
    return analyser
  }

  createMediaStreamSource(stream: MediaStream): MediaStreamAudioSourceNode {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      mediaStream: stream,
    } as any
  }

  resume(): Promise<void> {
    this.state = 'running'
    return Promise.resolve()
  }

  suspend(): Promise<void> {
    this.state = 'suspended'
    return Promise.resolve()
  }

  close(): Promise<void> {
    this.state = 'closed'
    return Promise.resolve()
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, [])
    }
    this.listeners.get(type)!.push(listener)
  }

  removeEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.listeners.get(event.type)
    if (listeners) {
      listeners.forEach((listener) => listener(event))
    }
    return true
  }
}

export class MockMediaStream {
  private tracks: MediaStreamTrack[] = []

  constructor(tracks: MediaStreamTrack[] = []) {
    this.tracks = tracks
  }

  getTracks(): MediaStreamTrack[] {
    return this.tracks
  }

  addTrack(track: MediaStreamTrack): void {
    this.tracks.push(track)
  }

  removeTrack(track: MediaStreamTrack): void {
    const index = this.tracks.indexOf(track)
    if (index > -1) {
      this.tracks.splice(index, 1)
    }
  }
}

export class MockMediaStreamTrack {
  kind: string = 'audio'
  enabled: boolean = true
  readyState: MediaStreamTrackState = 'live'

  stop(): void {
    this.readyState = 'ended'
  }
}

// Mock global AudioContext
global.AudioContext = vi.fn().mockImplementation(() => new MockAudioContext()) as any
global.window.AudioContext = global.AudioContext
;(global.window as any).webkitAudioContext = global.AudioContext

// Mock navigator.mediaDevices.getUserMedia
const mockGetUserMedia = vi.fn().mockResolvedValue(
  new MockMediaStream([new MockMediaStreamTrack() as unknown as MediaStreamTrack])
)

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
  },
})

// Mock legacy getUserMedia
;(navigator as any).getUserMedia = vi.fn()
;(navigator as any).webkitGetUserMedia = vi.fn()
;(navigator as any).mozGetUserMedia = vi.fn()
;(navigator as any).msGetUserMedia = vi.fn()

export { mockGetUserMedia }
