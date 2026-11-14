/**
 * Tests for the track editor: what it saves when the sound changes, when a
 * note is written with the pencil, when a take is recorded over a stretch,
 * and undo. Audio and MIDI are stubbed out.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const stubs = vi.hoisted(() => ({
  recorder: {
    phase: 'idle' as string,
    countIn: null,
    position: null,
    sounding: null,
    held: [] as number[],
    noteOn: vi.fn(),
    noteOff: vi.fn(),
    liveLines: [],
    liveProgression: null,
    recording: null as unknown,
    peek: vi.fn(() => null),
    start: vi.fn(async () => undefined),
    stop: vi.fn(),
    reset: vi.fn(),
    origin: vi.fn(() => 10),
  },
  preview: { playing: false, start: vi.fn(async (_options: unknown) => undefined), stop: vi.fn(), position: vi.fn(() => null) },
  recorderOptions: [] as { monitorKey?: string; bpm: number; acceptDrumChannel?: boolean }[],
}))

vi.mock('tone', () => ({
  getContext: () => ({ state: 'running' }),
  start: vi.fn(async () => undefined),
  Frequency: (pitch: number) => ({ toFrequency: () => pitch }),
  immediate: () => 0,
}))
vi.mock('~/lib/audio/instruments', () => {
  const instrument = () => ({
    synth: { volume: { value: 0 }, triggerAttackRelease: vi.fn(), triggerAttack: vi.fn(), triggerRelease: vi.fn(), releaseAll: vi.fn() },
    dispose: vi.fn(),
  })
  return {
    createTrackInstrument: vi.fn(instrument),
    createKeysInstrument: vi.fn(instrument),
    createBassInstrument: vi.fn(instrument),
    createDrumKitInstrument: vi.fn(instrument),
  }
})
vi.mock('~/hooks/useMIDIAccess', () => ({ useMIDIAccess: () => ({ access: null, accessStatus: 'granted', inputs: [] }) }))
vi.mock('~/hooks/useMIDIRecorder', () => ({
  useMIDIRecorder: (options: { monitorKey?: string; bpm: number; acceptDrumChannel?: boolean }) => {
    stubs.recorderOptions.push(options)
    return stubs.recorder
  },
}))
vi.mock('~/hooks/useTrackPreview', () => ({ useTrackPreview: () => stubs.preview }))

import { TrackEditor } from '../TrackEditor'
import type { BandRole, BandTrack } from '~/lib/audio/bandTracks'

beforeAll(() => {
  if (typeof window.PointerEvent === 'function') return
  class FakePointerEvent extends MouseEvent {
    pointerId: number
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
    }
  }
  window.PointerEvent = FakePointerEvent as unknown as typeof PointerEvent
})

const chords = [
  { chord: 'C', startBeat: 0, durationBeats: 4 },
  { chord: 'G', startBeat: 4, durationBeats: 4 },
]
const note = (beat: number, pitch = 60) => ({ beat, beats: 1, pitch, velocity: 0.7 })

const setup = (track?: Pick<BandTrack, 'notes'> & { voice?: string }, role: BandRole = 'lead') => {
  const onChange = vi.fn()
  const onClose = vi.fn()
  const view = render(
    <TrackEditor role={role} track={track} onChange={onChange} bpm={120} beatsPerBar={4} totalBeats={8} chords={chords} onClose={onClose} />,
  )
  return { onChange, onClose, user: userEvent.setup(), ...view }
}

describe('TrackEditor', () => {
  beforeEach(() => {
    stubs.recorder.phase = 'idle'
    stubs.recorder.recording = null
    stubs.recorderOptions.length = 0
    stubs.preview.start.mockClear()
    stubs.recorder.start.mockClear()
  })

  it('opens as a dialog over the song, with its chords on the roll and the sounds of the role', () => {
    setup()
    const dialog = screen.getByRole('dialog', { name: 'Melodía de la canción' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getAllByRole('radio').map((radio) => radio.textContent)).toEqual(['Teclado solista', 'Guitarra eléctrica', 'Saxo'])
    expect(screen.getByLabelText('Acordes')).toHaveTextContent('C')
    expect(screen.getByLabelText('Acordes')).toHaveTextContent('G')
    // No controller and no on-screen keys yet: nothing to record from.
    expect(screen.getByRole('button', { name: 'Grabar' })).toBeDisabled()
  })

  it('saves the sound as soon as it is chosen, and the keys are heard through it', async () => {
    const { user, onChange } = setup({ voice: 'leadKeys', notes: [note(0)] })
    await user.click(screen.getByRole('radio', { name: 'Saxo' }))
    expect(onChange).toHaveBeenLastCalledWith({ voice: 'sax', notes: [note(0)] })
    expect(stubs.recorderOptions.at(-1)?.monitorKey).toBe('lead:sax')
  })

  it('writes a note with the pencil, saves it in beats, and undoes it', async () => {
    const { user, onChange, baseElement } = setup()
    await user.click(screen.getByRole('button', { name: /Lápiz/ }))
    const svg = baseElement.querySelector('svg.block')!
    // 120 BPM: 48 px a beat. 100 px = past beat 2 → the note lands on beat 2 (eighth-note grid).
    fireEvent.pointerDown(svg, { clientX: 100, clientY: 6, pointerId: 1, button: 0 })
    fireEvent.pointerUp(svg, { clientX: 100, clientY: 6, pointerId: 1 })
    expect(onChange).toHaveBeenLastCalledWith({ voice: 'leadKeys', notes: [{ beat: 2, beats: 0.5, pitch: 96, velocity: 0.8 }] })

    await user.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(onChange).toHaveBeenLastCalledWith({ voice: 'leadKeys', notes: [] })
  })

  it('a take recorded from a bar replaces what the track had in the stretch it covers', async () => {
    const { user, onChange, rerender } = setup({ voice: 'guitar', notes: [note(0), note(5), note(7, 64)] })
    await user.click(screen.getByRole('button', { name: 'Teclado en pantalla' }))
    fireEvent.change(screen.getByLabelText('Compás desde el que se escucha y se graba'), { target: { value: '2' } })
    await user.click(screen.getByRole('button', { name: 'Grabar' }))
    expect(stubs.recorder.start).toHaveBeenCalled()
    // The chords keep playing under the take, from the bar it starts on, on the recorder's clock.
    expect(stubs.preview.start).toHaveBeenLastCalledWith(expect.objectContaining({ fromBeat: 4, origin: 10 }))

    // Two seconds played at 120 BPM = 4 beats: bar 2, whole.
    stubs.recorder.recording = {
      notes: [{ startTimeSeconds: 0.5, durationSeconds: 0.5, pitchMidi: 72, amplitude: 0.9 }],
      progression: { bars: [], beatsPerBar: 4, downbeatOffset: 0 },
      durationSeconds: 2,
      grid: { bpm: 120, beatsPerBar: 4 },
    }
    act(() => {
      rerender(
        <TrackEditor role="lead" track={undefined} onChange={onChange} bpm={120} beatsPerBar={4} totalBeats={8} chords={chords} onClose={vi.fn()} />,
      )
    })
    expect(onChange).toHaveBeenLastCalledWith({
      voice: 'guitar',
      notes: [note(0), { beat: 5, beats: 1, pitch: 72, velocity: 0.9 }],
    })
  })

  it('listens from the chosen bar with the chords, and Vaciar leaves the track empty', async () => {
    const { user, onChange } = setup({ voice: 'leadKeys', notes: [note(0)] })
    await user.click(screen.getByRole('button', { name: 'Escuchar' }))
    const options = stubs.preview.start.mock.lastCall?.[0] as unknown as { fromBeat: number; toBeat: number; layers: { notes: unknown[] }[] }
    expect(options).toMatchObject({ fromBeat: 0, toBeat: 16, bpm: 120 })
    expect(options.layers.map((layer) => layer.notes.length)).toEqual([1, 2])

    await user.click(screen.getByRole('button', { name: 'Vaciar' }))
    expect(onChange).toHaveBeenLastCalledWith({ voice: 'leadKeys', notes: [] })
  })

  it('for the drums: no sound to choose, the pads are recorded, and every note lands on a drum of the kit', async () => {
    const { user, onChange, baseElement } = setup(undefined, 'drums')
    expect(screen.getByRole('dialog', { name: 'Batería de la canción' })).toBeInTheDocument()
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
    expect(stubs.recorderOptions.at(-1)).toMatchObject({ acceptDrumChannel: true, monitorKey: 'drums:' })

    // The roll shows C2–B2 (rows from B2 down). A tap on the E2 row (index 7) is a snare: written on D2.
    await user.click(screen.getByRole('button', { name: /Lápiz/ }))
    const svg = baseElement.querySelector('svg.block')!
    fireEvent.pointerDown(svg, { clientX: 50, clientY: 7 * 12 + 6, pointerId: 1, button: 0 })
    fireEvent.pointerUp(svg, { clientX: 50, clientY: 7 * 12 + 6, pointerId: 1 })
    expect(onChange).toHaveBeenLastCalledWith({ voice: undefined, notes: [{ beat: 1, beats: 0.25, pitch: 38, velocity: 0.8 }] })
  })

  it('for the chords take, the chords are not played under it unless asked', async () => {
    const { user } = setup({ notes: [note(0)] }, 'keys')
    expect(screen.getByRole('checkbox', { name: 'Con los acordes' })).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Escuchar' }))
    const options = stubs.preview.start.mock.lastCall?.[0] as unknown as { layers: unknown[] }
    expect(options.layers).toHaveLength(1)
  })
})
