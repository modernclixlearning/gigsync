import { describe, it, expect, vi } from 'vitest'

vi.mock('tone', () => ({ Frequency: (pitch: number) => ({ toFrequency: () => pitch }) }))

import { previewEvents } from '../useTrackPreview'
import type { PlayableVoice } from '~/lib/audio/instruments'

const voice = (): PlayableVoice => ({
  triggerAttackRelease: vi.fn(),
  triggerAttack: vi.fn(),
  triggerRelease: vi.fn(),
  releaseAll: vi.fn(),
  volume: { value: 0 },
})

describe('previewEvents', () => {
  it('merges the layers in time order, in seconds from the starting beat', () => {
    const lead = voice()
    const piano = voice()
    const events = previewEvents(
      [
        { instrument: lead, notes: [{ beat: 5, beats: 1, pitches: [72], velocity: 0.8 }] },
        { instrument: piano, notes: [{ beat: 4, beats: 4, pitches: [48, 60, 64], velocity: 0.5 }] },
      ],
      120,
      4,
    )
    expect(events.map((e) => [e.time, e.seconds, e.frequencies, e.instrument === piano])).toEqual([
      [0, 2, [48, 60, 64], true],
      [0.5, 0.5, [72], false],
    ])
  })

  it('leaves out what started before the starting beat and what starts after the end, and cuts at the end', () => {
    const lead = voice()
    const events = previewEvents(
      [
        {
          instrument: lead,
          notes: [
            { beat: 0, beats: 8, pitches: [60], velocity: 0.7 },
            { beat: 6, beats: 4, pitches: [62], velocity: 0.7 },
            { beat: 8, beats: 1, pitches: [64], velocity: 0.7 },
          ],
        },
      ],
      60,
      4,
      8,
    )
    expect(events.map((e) => [e.time, e.seconds, e.frequencies])).toEqual([[2, 2, [62]]])
  })
})
