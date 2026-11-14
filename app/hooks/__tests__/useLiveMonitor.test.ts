/**
 * Tests for useLiveMonitor: the keys play the instrument of the chosen role,
 * the pads (channel 10) always hit the drum kit, and with the drums as the
 * role the keys are a kit too.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const audio = vi.hoisted(() => ({
  built: [] as { kind: string; voice?: string; attacks: [number, number][]; releases: number[]; disposed: boolean; volume: { value: number } }[],
  hits: [] as [string, number][],
  kits: 0,
  kitVolume: 0,
}))

vi.mock('tone', () => ({
  getContext: () => ({ state: 'running' }),
  start: vi.fn(() => Promise.resolve()),
  immediate: () => 0,
  Frequency: (pitch: number) => ({ toFrequency: () => pitch }),
  gainToDb: (gain: number) => 20 * Math.log10(gain),
}))

vi.mock('~/lib/audio/instruments', () => {
  const instrument = (kind: string) => (voice?: string) => {
    const record = { kind, voice, attacks: [] as [number, number][], releases: [] as number[], disposed: false, volume: { value: 0 } }
    audio.built.push(record)
    return {
      synth: {
        volume: record.volume,
        triggerAttack: (notes: number[], _time: number, velocity: number) => record.attacks.push([notes[0], velocity]),
        triggerRelease: (notes: number[]) => record.releases.push(notes[0]),
        triggerAttackRelease: vi.fn(),
        releaseAll: vi.fn(),
      },
      dispose: () => {
        record.disposed = true
      },
    }
  }
  return {
    createBassInstrument: instrument('bass'),
    createKeysInstrument: instrument('keys'),
    createTrackInstrument: instrument('track'),
    createDrumKit: () => {
      audio.kits += 1
      return {
        hit: (part: string, _time: number, velocity: number) => audio.hits.push([part, velocity]),
        setVolume: (gain: number) => {
          audio.kitVolume = gain
        },
        dispose: vi.fn(),
      }
    },
  }
})

import { useLiveMonitor, type UseLiveMonitorOptions } from '../useLiveMonitor'

class FakeMIDIInput extends EventTarget {
  open = vi.fn(() => Promise.resolve(this))
  send(bytes: number[]) {
    const event = new Event('midimessage') as Event & { data: Uint8Array }
    Object.defineProperty(event, 'data', { value: new Uint8Array(bytes) })
    this.dispatchEvent(event)
  }
}

describe('useLiveMonitor', () => {
  let input: FakeMIDIInput
  let base: UseLiveMonitorOptions

  beforeEach(() => {
    audio.built.length = 0
    audio.hits.length = 0
    audio.kits = 0
    input = new FakeMIDIInput()
    base = {
      enabled: true,
      access: { inputs: new Map([['in', input]]) } as unknown as MIDIAccess,
      inputId: 'in',
      role: 'lead',
      bassVoice: 'electric',
      leadVoice: 'sax',
      arrangementVoice: 'strings',
    }
  })

  it('builds nothing while it is off', () => {
    renderHook(() => useLiveMonitor({ ...base, enabled: false }))
    expect(audio.built).toHaveLength(0)
    expect(audio.kits).toBe(0)
  })

  it('plays the keys through the voice of the chosen role, at its level', () => {
    const { result } = renderHook(() => useLiveMonitor({ ...base, volume: 0.5 }))
    expect(audio.built.map((i) => [i.kind, i.voice])).toEqual([['track', 'sax']])
    expect(audio.built[0].volume.value).toBeCloseTo(-6.02, 1)

    act(() => {
      input.send([0x90, 72, 127])
      input.send([0x90, 76, 64])
    })
    expect(audio.built[0].attacks).toEqual([
      [72, 1],
      [76, 64 / 127],
    ])
    expect(result.current.held).toEqual([72, 76])

    act(() => input.send([0x80, 72, 0]))
    expect(audio.built[0].releases).toEqual([72])
    expect(result.current.held).toEqual([76])
  })

  it('sends the pads (channel 10) to the drum kit whatever the role', () => {
    const { result } = renderHook(() => useLiveMonitor(base))
    act(() => {
      input.send([0x99, 36, 127])
      input.send([0x99, 38, 100])
      input.send([0x89, 36, 0]) // pad released: nothing to stop
    })
    expect(audio.hits).toEqual([
      ['kick', 1],
      ['snare', 100 / 127],
    ])
    expect(audio.built[0].attacks).toEqual([])
    expect(result.current.lastDrum).toEqual({ part: 'snare', count: 2 })
  })

  it('with the drums as the role, the keys hit the kit', () => {
    renderHook(() => useLiveMonitor({ ...base, role: 'drums' }))
    expect(audio.built).toHaveLength(0)
    act(() => input.send([0x90, 66, 90]))
    expect(audio.hits).toEqual([['hat', 90 / 127]])
  })

  it('changes instrument with the role and frees the one before', () => {
    const { rerender } = renderHook((props: UseLiveMonitorOptions) => useLiveMonitor(props), { initialProps: base })
    rerender({ ...base, role: 'bass', bassVoice: 'upright' })
    expect(audio.built.map((i) => [i.kind, i.voice, i.disposed])).toEqual([
      ['track', 'sax', true],
      ['bass', 'upright', false],
    ])
    act(() => input.send([0x90, 40, 127]))
    expect(audio.built[1].attacks).toEqual([[40, 1]])
    // A voice of another role changing does not rebuild this one.
    rerender({ ...base, role: 'bass', bassVoice: 'upright', leadVoice: 'guitar' })
    expect(audio.built).toHaveLength(2)
  })
})
