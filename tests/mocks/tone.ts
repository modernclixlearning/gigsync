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

  start = vi.fn((time?: number) => {
    this.state = 'started'
  })

  stop = vi.fn((time?: number) => {
    this.state = 'stopped'
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

export class MockContext {
  state: AudioContextState = 'running'

  resume = vi.fn().mockResolvedValue(undefined)
  suspend = vi.fn().mockResolvedValue(undefined)
  close = vi.fn().mockResolvedValue(undefined)
}

const mockTransport = new MockTransport()
const mockContext = new MockContext()

// Mock Tone.js module
const mockTone = {
  Synth: vi.fn().mockImplementation(() => new MockSynth()),
  Transport: {
    get: vi.fn(() => mockTransport),
  },
  Loop: MockLoop,
  context: mockContext,
  start: vi.fn().mockResolvedValue(undefined),
  gainToDb: vi.fn((gain: number) => {
    return 20 * Math.log10(gain)
  }),
  dbToGain: vi.fn((db: number) => {
    return Math.pow(10, db / 20)
  }),
}

export default mockTone
