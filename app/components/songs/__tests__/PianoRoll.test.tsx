import { describe, it, expect, vi, beforeAll } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PianoRoll } from '../PianoRoll'
import type { ChordProgression, NoteEvent } from '~/lib/audioAnalysis/types'

// jsdom has no PointerEvent: without it clientX/pointerId are dropped.
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

const note = (pitchMidi: number, startTimeSeconds: number, durationSeconds: number): NoteEvent => ({
  pitchMidi,
  startTimeSeconds,
  durationSeconds,
  amplitude: 0.8,
})

// 120 BPM in 4/4: a beat is 0.5 s = 48 px, a bar 2 s; rows are 12 px.
const notes = [note(60, 0, 1.9), note(64, 0, 1.9), note(67, 0, 1.9), note(57, 2, 1.9)]
const progression: ChordProgression = {
  beatsPerBar: 4,
  downbeatOffset: 0,
  bars: [
    { index: 0, startTime: 0, endTime: 2, cells: [{ chord: 'C', beats: 4, startTime: 0, endTime: 2, confidence: 1 }] },
    { index: 1, startTime: 2, endTime: 4, cells: [{ chord: 'Am', beats: 4, startTime: 2, endTime: 4, confidence: 1 }] },
  ],
}
const base = { notes, bpm: 120, beatsPerBar: 4, durationSeconds: 4 }

function lastNotes(onChangeNotes: ReturnType<typeof vi.fn>): NoteEvent[] {
  return onChangeNotes.mock.lastCall?.[0] as NoteEvent[]
}

function drag(element: Element, dx: number, dy: number) {
  const svg = element.closest('svg')!
  fireEvent.pointerDown(element, { clientX: 10, clientY: 10, pointerId: 1, button: 0 })
  fireEvent.pointerMove(svg, { clientX: 10 + dx, clientY: 10 + dy, pointerId: 1 })
  fireEvent.pointerUp(svg, { clientX: 10 + dx, clientY: 10 + dy, pointerId: 1 })
}

describe('PianoRoll', () => {
  it('draws the chords over their bars and every note', () => {
    render(<PianoRoll {...base} progression={progression} onChangeNotes={vi.fn()} />)
    const chords = screen.getByLabelText('Acordes')
    expect(chords).toHaveTextContent('C')
    expect(chords).toHaveTextContent('Am')
    expect(screen.getAllByRole('button', { name: /compás/ })).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'A3, compás 2' })).toBeInTheDocument()
  })

  it('draws the subdivisions of the grid', () => {
    const { container } = render(<PianoRoll {...base} subdivision={3} />)
    // 2 bars × 4 beats × 3 + the closing line.
    expect(container.querySelectorAll('svg line')).toHaveLength(25)
  })

  it('moves a dragged note on the grid, in time and pitch', () => {
    const onChangeNotes = vi.fn()
    const onAudition = vi.fn()
    render(<PianoRoll {...base} subdivision={2} onChangeNotes={onChangeNotes} onAudition={onAudition} />)
    drag(screen.getByRole('button', { name: 'C4, compás 1' }), 50, -24)
    expect(lastNotes(onChangeNotes)[0]).toMatchObject({ pitchMidi: 62, startTimeSeconds: 0.5, durationSeconds: 1.9 })
    expect(onAudition).toHaveBeenCalledWith(60)
    expect(onAudition).toHaveBeenLastCalledWith(62)
  })

  it('stretches a note from its right edge, snapped to the grid', () => {
    const onChangeNotes = vi.fn()
    render(<PianoRoll {...base} subdivision={2} onChangeNotes={onChangeNotes} />)
    drag(screen.getByLabelText('Estirar E4'), 24, 0)
    const stretched = lastNotes(onChangeNotes)[1]
    expect(stretched.startTimeSeconds).toBe(0)
    expect(stretched.durationSeconds).toBeCloseTo(2.25)
  })

  it('selects a note on click without changing anything, and Supr deletes it', () => {
    const onChangeNotes = vi.fn()
    render(<PianoRoll {...base} onChangeNotes={onChangeNotes} />)
    const g = screen.getByRole('button', { name: 'G4, compás 1' })
    drag(g, 0, 0)
    expect(onChangeNotes).not.toHaveBeenCalled()
    expect(g).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(screen.getByRole('region', { name: 'Carrete MIDI' }), { key: 'Delete' })
    expect(lastNotes(onChangeNotes).map((n) => n.pitchMidi)).toEqual([60, 64, 57])
  })

  it('double-click deletes a note, or adds one on an empty spot', () => {
    const onChangeNotes = vi.fn()
    const { container } = render(<PianoRoll {...base} subdivision={2} onChangeNotes={onChangeNotes} />)
    fireEvent.doubleClick(screen.getByRole('button', { name: 'A3, compás 2' }))
    expect(lastNotes(onChangeNotes)).toHaveLength(3)

    // Range is C3 (48) … D5 (74): row 5 from the top is A4 (69). x 100 px = 1.04 s → 1 s on an eighth grid.
    fireEvent.doubleClick(container.querySelector('svg')!, { clientX: 100, clientY: 5 * 12 + 6 })
    expect(lastNotes(onChangeNotes)[4]).toMatchObject({ pitchMidi: 69, startTimeSeconds: 1, durationSeconds: 0.25 })
  })

  it('moves the playhead while there is one and hides it when playback stops', async () => {
    const { container, rerender } = render(<PianoRoll {...base} getPlayhead={() => 1} />)
    const playhead = container.querySelector('[aria-hidden]') as HTMLElement
    await waitFor(() => expect(playhead.style.display).toBe('block'))
    expect(playhead.style.transform).toBe('translateX(96px)') // 1 s = 2 beats × 48 px
    rerender(<PianoRoll {...base} />)
    expect(playhead.style.display).toBe('none')
  })

  it('is read-only without onChangeNotes (while recording)', () => {
    render(<PianoRoll {...base} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByRole('region', { name: 'Carrete MIDI' })).not.toHaveAttribute('tabindex')
  })
})
