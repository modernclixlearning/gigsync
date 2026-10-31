import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PianoRoll } from '../PianoRoll'
import type { ChordProgression, NoteEvent } from '~/lib/audioAnalysis/types'

const note = (pitchMidi: number, startTimeSeconds: number, durationSeconds: number): NoteEvent => ({
  pitchMidi,
  startTimeSeconds,
  durationSeconds,
  amplitude: 0.8,
})

// 120 BPM in 4/4: a bar is 2 s.
const notes = [note(60, 0, 1.9), note(64, 0, 1.9), note(67, 0, 1.9), note(57, 2, 1.9)]
const progression: ChordProgression = {
  beatsPerBar: 4,
  downbeatOffset: 0,
  bars: [
    { index: 0, startTime: 0, endTime: 2, cells: [{ chord: 'C', beats: 4, startTime: 0, endTime: 2, confidence: 1 }] },
    { index: 1, startTime: 2, endTime: 4, cells: [{ chord: 'Am', beats: 4, startTime: 2, endTime: 4, confidence: 1 }] },
  ],
}

describe('PianoRoll', () => {
  it('draws the chords over their bars and every note', () => {
    render(
      <PianoRoll
        notes={notes}
        bpm={120}
        beatsPerBar={4}
        durationSeconds={4}
        progression={progression}
        onDeleteNote={vi.fn()}
      />,
    )
    const chords = screen.getByLabelText('Acordes')
    expect(chords).toHaveTextContent('C')
    expect(chords).toHaveTextContent('Am')
    expect(screen.getAllByRole('button')).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'A3, compás 2' })).toBeInTheDocument()
  })

  it('deletes the clicked note', () => {
    const onDeleteNote = vi.fn()
    render(<PianoRoll notes={notes} bpm={120} beatsPerBar={4} durationSeconds={4} onDeleteNote={onDeleteNote} />)
    fireEvent.click(screen.getByRole('button', { name: 'E4, compás 1' }))
    expect(onDeleteNote).toHaveBeenCalledWith(1)
  })

  it('moves the playhead while there is one and hides it when playback stops', async () => {
    const props = { notes, bpm: 120, beatsPerBar: 4, durationSeconds: 4 }
    const { container, rerender } = render(<PianoRoll {...props} getPlayhead={() => 1} />)
    const playhead = container.querySelector('[aria-hidden]') as HTMLElement
    await waitFor(() => expect(playhead.style.display).toBe('block'))
    expect(playhead.style.transform).toBe('translateX(96px)') // 1 s = 2 beats × 48 px
    rerender(<PianoRoll {...props} />)
    expect(playhead.style.display).toBe('none')
  })

  it('is read-only without onDeleteNote (while recording)', () => {
    render(<PianoRoll notes={notes} bpm={120} beatsPerBar={4} durationSeconds={4} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByRole('region', { name: 'Carrete MIDI' })).toBeInTheDocument()
  })
})
