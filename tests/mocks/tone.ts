/**
 * Mocks for Tone.js
 */

import { vi } from 'vitest'

export class MockSynth {
  volume = {
    value: 0,
  }

  toDestination(): MockSynth {
    return this
  }

  triggerAttackRelease = vi.fn((frequency: number, duration: string, time?: number) => {
    // Mock implementation
  })

  dispose = vi.fn()
}

export class MockTransport {
  state: 'started' | 'stopped' | 'paused' = 'stopped'
  bpm = {
    value: 120,
  }
  position: string = '0:0:0'
  timeSignature: [number, number] = [4, 4]
  seconds: number = 0

  start = vi.fn((time?: number) => {
    this.state = 'started'
  })

  stop = vi.fn((time?: number) => {
    this.state = 'stopped'
    this.position = '0:0:0'
    this.seconds = 0
  })

  pause = vi.fn((time?: number) => {
    this.state = 'paused'
  })
}

export class MockLoop {
  private callback: (time: number) => void
  private interval: string
  private isStarted = false

  constructor(callback: (time: number) => void, interval: string) {
    this.callback = callback
    this.interval = interval
  }

  start = vi.fn((time?: number) => {
    this.isStarted = true
  })

  stop = vi.fn(() => {
    this.isStarted = false
  })

  dispose = vi.fn(() => {
    this.isStarted = false
  })
}

// Create a spy constructor for MockLoop
const MockLoopSpy = vi.fn().mockImplementation((callback: (time: number) => void, interval: string) => {
  return new MockLoop(callback, interval)
})

export class MockContext {
  state: AudioContextState = 'running'

  resume = vi.fn().mockResolvedValue(undefined)
  suspend = vi.fn().mockResolvedValue(undefined)
  close = vi.fn().mockResolvedValue(undefined)
}

const mockTransport = new MockTransport()
const mockContext = new MockContext()

// Mock Draw for scheduling
export class MockDraw {
  static schedule = vi.fn((callback: () => void, time?: number) => {
    // Execute callback immediately in tests
    callback()
  })
}

// Mock Tone.js module - Transport needs to be both an object with properties and methods
Object.assign(mockTransport, {
  get: vi.fn(() => mockTransport),
})

// Create Transport object that can be accessed as Tone.Transport
const mockTone = {
  Synth: vi.fn().mockImplementation(() => new MockSynth()),
  Transport: Object.assign(mockTransport, {
    get: vi.fn(() => mockTransport),
  }),
  getTransport: vi.fn(() => mockTransport),
  Loop: MockLoopSpy,
  Draw: MockDraw,
  context: mockContext,
  start: vi.fn().mockResolvedValue(undefined),
  now: vi.fn(() => performance.now() / 1000), // Return seconds
  gainToDb: vi.fn((gain: number) => {
    return 20 * Math.log10(gain)
  }),
  dbToGain: vi.fn((db: number) => {
    return Math.pow(10, db / 20)
  }),
}

export default mockTone
