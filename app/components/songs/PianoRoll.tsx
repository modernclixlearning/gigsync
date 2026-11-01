import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type MouseEvent } from 'react'
import { cn } from '~/lib/utils'
import {
  duplicateNotes,
  isBlackKey,
  moveNotes,
  noteName,
  notesInBox,
  pitchRange,
  resizeNotes,
  snapTime,
} from '~/lib/midi/pianoRoll'
import { beatSeconds } from '~/lib/midi/recording'
import type { ChordProgression, NoteEvent } from '~/lib/audioAnalysis/types'

const PX_PER_BEAT = 48
const ROW_PX = 12
const KEYS_PX = 44
const CHORD_ROW_PX = 28
/** Width of the grab area at a note's right edge, for stretching it. */
const HANDLE_PX = 6
/** Pointer travel before a press on a note becomes a drag. */
const DRAG_THRESHOLD_PX = 3
const NEW_NOTE_AMPLITUDE = 0.8
/** Arrow keys may take notes past the drawn rows (the view grows to fit); dragging stays on them. */
const MIDI_RANGE = { low: 0, high: 127 }

interface PianoRollProps {
  notes: NoteEvent[]
  bpm: number
  beatsPerBar: number
  /** Seconds to show from the first downbeat; the grid runs to the end of that bar. */
  durationSeconds: number
  /** Chords drawn above their bar or half bar. */
  progression?: ChordProgression | null
  /** Playhead in seconds from the first downbeat, read every animation frame; null hides it. */
  getPlayhead?: () => number | null
  /** Grid lines per beat; edits snap to them (1 = quarter notes, 2 = eighths…). */
  subdivision?: number
  /**
   * Makes the roll editable: click a note to select it (Shift/Ctrl+click adds
   * or removes, dragging over empty space selects with a box, Ctrl+A all),
   * drag a selected note to move the selection, its right edge to stretch it,
   * double-click to add or delete, Supr to delete the selection, arrows to
   * nudge it, Ctrl+D to duplicate it. Gets the whole new note list after each
   * edit.
   */
  onChangeNotes?: (notes: NoteEvent[]) => void
  /** Called with the pitch of a note that is picked, added or moved, to play it. */
  onAudition?: (pitch: number) => void
  /** Selected note indices, when the parent keeps them (otherwise the roll does). */
  selection?: number[]
  onSelectionChange?: (selection: number[]) => void
}

type Drag =
  | {
      kind: 'notes'
      mode: 'move' | 'resize'
      /** The note under the pointer; the others follow it. */
      anchor: number
      indices: number[]
      pointerId: number
      startX: number
      startY: number
      moved: boolean
      /** A click (no drag) on a note of a bigger selection selects just that note. */
      collapseOnClick: boolean
    }
  | {
      kind: 'box'
      pointerId: number
      startX: number
      startY: number
      moved: boolean
      /** Selection kept under the box (Shift/Ctrl adds to it). */
      base: number[]
    }

/** Box in grid pixels, for drawing the selection rectangle. */
interface Marquee {
  x: number
  y: number
  width: number
  height: number
}

const isToggleClick = (event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) =>
  event.shiftKey || event.ctrlKey || event.metaKey

/**
 * The take as a piano roll: one row per semitone (keyboard on the left), the
 * click's bars, beats and subdivisions as the grid, the detected chords on
 * top. Scrolls sideways and follows the playhead while it moves.
 */
export function PianoRoll({
  notes,
  bpm,
  beatsPerBar,
  durationSeconds,
  progression,
  getPlayhead,
  subdivision = 1,
  onChangeNotes,
  onAudition,
  selection: controlledSelection,
  onSelectionChange,
}: PianoRollProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)
  /** Notes as they look mid-drag (committed on release). */
  const [draft, setDraft] = useState<NoteEvent[] | null>(null)
  const [ownSelection, setOwnSelection] = useState<number[]>([])
  const [marquee, setMarquee] = useState<Marquee | null>(null)

  const editable = !!onChangeNotes
  const shown = draft ?? notes
  const selection = (controlledSelection ?? ownSelection).filter((i) => i < notes.length)
  const selectedSet = new Set(selection)
  const select = (next: number[]) => {
    const unique = [...new Set(next)].sort((a, b) => a - b)
    if (!controlledSelection) setOwnSelection(unique)
    onSelectionChange?.(unique)
  }

  const beat = beatSeconds(bpm)
  const bpb = Math.max(1, Math.round(beatsPerBar))
  const sub = Math.max(1, Math.round(subdivision))
  const step = beat / sub
  const notesEnd = shown.reduce((end, n) => Math.max(end, n.startTimeSeconds + n.durationSeconds), 0)
  const bars = Math.max(1, Math.ceil(Math.max(durationSeconds, notesEnd) / (beat * bpb) - 1e-6))
  const totalBeats = bars * bpb
  const width = totalBeats * PX_PER_BEAT
  const range = pitchRange(notes)
  const { low, high } = range
  const pitches = Array.from({ length: high - low + 1 }, (_, i) => high - i)
  const height = pitches.length * ROW_PX
  const x = (seconds: number) => (seconds / beat) * PX_PER_BEAT
  const y = (pitch: number) => (high - pitch) * ROW_PX

  // Playhead: moved on every frame without re-rendering; the view follows it.
  useEffect(() => {
    const playhead = playheadRef.current
    if (!getPlayhead || !playhead) return
    let frame = 0
    const tick = () => {
      const seconds = getPlayhead()
      if (seconds === null || seconds < 0) {
        playhead.style.display = 'none'
      } else {
        const px = (seconds / beat) * PX_PER_BEAT
        playhead.style.display = 'block'
        playhead.style.transform = `translateX(${px}px)`
        const scroller = scrollRef.current
        if (scroller) {
          const visible = scroller.clientWidth - KEYS_PX
          const left = scroller.scrollLeft
          if (px > left + visible - 64 || px < left) scroller.scrollLeft = Math.max(0, px - 64)
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      playhead.style.display = 'none'
    }
  }, [getPlayhead, beat])

  // Start scrolled to where the notes are (vertically).
  const centeredRef = useRef(false)
  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller || centeredRef.current || notes.length === 0) return
    centeredRef.current = true
    const middle = (Math.min(...notes.map((n) => n.pitchMidi)) + Math.max(...notes.map((n) => n.pitchMidi))) / 2
    scroller.scrollTop = Math.max(0, y(middle) + CHORD_ROW_PX - scroller.clientHeight / 2)
  })

  /** Seconds and pitch under the pointer, from the grid's own box. */
  const gridPoint = (clientX: number, clientY: number) => {
    const box = svgRef.current?.getBoundingClientRect()
    const px = clientX - (box?.left ?? 0)
    const py = clientY - (box?.top ?? 0)
    return {
      seconds: Math.max(0, (px / PX_PER_BEAT) * beat),
      pitch: Math.min(high, Math.max(low, high - Math.floor(py / ROW_PX))),
    }
  }

  /** Remove notes; the selection goes with them. */
  const deleteNotes = (indices: number[]) => {
    if (indices.length === 0) return
    const removing = new Set(indices)
    select([])
    onChangeNotes?.(notes.filter((_, i) => !removing.has(i)))
  }

  const handleNotePointerDown = (event: PointerEvent<SVGRectElement>, index: number, mode: 'move' | 'resize') => {
    if (!editable || event.button !== 0) return
    event.stopPropagation()
    scrollRef.current?.focus({ preventScroll: true })
    const wasSelected = selectedSet.has(index)
    let indices: number[]
    if (isToggleClick(event)) {
      // Shift/Ctrl+click adds or removes this note; a removed one isn't dragged.
      if (wasSelected) {
        select(selection.filter((i) => i !== index))
        return
      }
      indices = [...selection, index]
    } else {
      // A note already in the selection drags the whole selection.
      indices = wasSelected ? selection : [index]
    }
    select(indices)
    svgRef.current?.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      kind: 'notes',
      mode,
      anchor: index,
      indices,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      collapseOnClick: wasSelected && !isToggleClick(event) && selection.length > 1,
    }
    onAudition?.(notes[index].pitchMidi)
  }

  const handleGridPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (!editable || event.button !== 0) return
    scrollRef.current?.focus({ preventScroll: true })
    svgRef.current?.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      kind: 'box',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      base: isToggleClick(event) ? selection : [],
    }
  }

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD_PX) return
    drag.moved = true

    if (drag.kind === 'box') {
      const box = svgRef.current?.getBoundingClientRect()
      const x0 = drag.startX - (box?.left ?? 0)
      const y0 = drag.startY - (box?.top ?? 0)
      const x1 = event.clientX - (box?.left ?? 0)
      const y1 = event.clientY - (box?.top ?? 0)
      setMarquee({ x: Math.min(x0, x1), y: Math.min(y0, y1), width: Math.abs(x1 - x0), height: Math.abs(y1 - y0) })
      const hit = notesInBox(notes, {
        fromSeconds: (Math.min(x0, x1) / PX_PER_BEAT) * beat,
        toSeconds: (Math.max(x0, x1) / PX_PER_BEAT) * beat,
        highPitch: high - Math.floor(Math.min(y0, y1) / ROW_PX),
        lowPitch: high - Math.floor(Math.max(y0, y1) / ROW_PX),
      })
      select([...drag.base, ...hit])
      return
    }

    const deltaSeconds = (dx / PX_PER_BEAT) * beat
    const next =
      drag.mode === 'move'
        ? moveNotes(notes, drag.indices, drag.anchor, deltaSeconds, -Math.round(dy / ROW_PX), step, range)
        : resizeNotes(notes, drag.indices, drag.anchor, deltaSeconds, step)
    const before = (draft ?? notes)[drag.anchor]
    if (drag.mode === 'move' && next[drag.anchor].pitchMidi !== before.pitchMidi) onAudition?.(next[drag.anchor].pitchMidi)
    setDraft(next)
  }

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    svgRef.current?.releasePointerCapture?.(event.pointerId)
    if (drag.kind === 'box') {
      setMarquee(null)
      // A plain click on empty space clears the selection.
      if (!drag.moved && drag.base.length === 0) select([])
      return
    }
    if (drag.moved && draft) onChangeNotes?.(draft)
    else if (drag.collapseOnClick) select([drag.anchor])
    setDraft(null)
  }

  const handleDoubleClick = (event: MouseEvent<SVGSVGElement>) => {
    if (!editable) return
    const target = event.target as Element
    const index = target.getAttribute('data-note')
    if (index !== null) {
      deleteNotes([Number(index)])
      return
    }
    const { seconds, pitch } = gridPoint(event.clientX, event.clientY)
    const created: NoteEvent = {
      pitchMidi: pitch,
      startTimeSeconds: snapTime(seconds, step, true),
      durationSeconds: step,
      amplitude: NEW_NOTE_AMPLITUDE,
    }
    select([notes.length])
    onChangeNotes?.([...notes, created])
    onAudition?.(pitch)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!editable) return
    const command = event.ctrlKey || event.metaKey
    if (command && event.key.toLowerCase() === 'a') {
      event.preventDefault()
      select(notes.map((_, i) => i))
      return
    }
    if (selection.length === 0) return
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      deleteNotes(selection)
    } else if (event.key === 'Escape') {
      event.stopPropagation()
      select([])
    } else if (command && event.key.toLowerCase() === 'd') {
      event.preventDefault()
      const { notes: next, copies } = duplicateNotes(notes, selection, step)
      select(copies)
      onChangeNotes?.(next)
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      // Transpose: a semitone, Shift an octave.
      event.preventDefault()
      const semitones = (event.shiftKey ? 12 : 1) * (event.key === 'ArrowUp' ? 1 : -1)
      const next = moveNotes(notes, selection, selection[0], 0, semitones, step, MIDI_RANGE)
      if (next[selection[0]].pitchMidi !== notes[selection[0]].pitchMidi) onAudition?.(next[selection[0]].pitchMidi)
      onChangeNotes?.(next)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      // Nudge: a grid step, Shift a bar.
      event.preventDefault()
      const amount = (event.shiftKey ? beat * bpb : step) * (event.key === 'ArrowRight' ? 1 : -1)
      onChangeNotes?.(moveNotes(notes, selection, selection[0], amount, 0, step, MIDI_RANGE))
    }
  }

  const cells = (progression?.bars ?? []).flatMap((bar) => bar.cells).filter((cell) => cell.chord)

  return (
    <div
      ref={scrollRef}
      role="region"
      aria-label="Carrete MIDI"
      tabIndex={editable ? 0 : undefined}
      aria-multiselectable={editable ? true : undefined}
      onKeyDown={handleKeyDown}
      className="h-full overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1f36] focus:outline-none"
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `${KEYS_PX}px ${width}px`,
          gridTemplateRows: `${CHORD_ROW_PX}px ${height}px`,
        }}
      >
        <div className="sticky top-0 left-0 z-30 bg-white dark:bg-[#1a1f36] border-b border-r border-slate-200 dark:border-slate-700" />

        <div
          aria-label="Acordes"
          className="sticky top-0 z-20 bg-white dark:bg-[#1a1f36] border-b border-slate-200 dark:border-slate-700"
        >
          {Array.from({ length: bars }, (_, bar) => (
            <span
              key={bar}
              className="absolute top-0 h-full border-l border-slate-300 dark:border-slate-600 pl-1 text-[10px] leading-none pt-0.5 text-slate-400"
              style={{ left: bar * bpb * PX_PER_BEAT }}
            >
              {bar + 1}
            </span>
          ))}
          {cells.map((cell) => (
            <span
              key={cell.startTime}
              className="absolute bottom-0.5 truncate px-1 text-sm font-semibold text-slate-900 dark:text-white"
              style={{ left: x(cell.startTime) + 12, width: x(cell.endTime - cell.startTime) - 12 }}
            >
              {cell.chord}
            </span>
          ))}
        </div>

        <div className="sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700">
          {pitches.map((pitch) => (
            <div
              key={pitch}
              className={
                isBlackKey(pitch)
                  ? 'bg-slate-700 dark:bg-slate-900 border-b border-slate-800'
                  : 'bg-white dark:bg-slate-200 border-b border-slate-200 dark:border-slate-400'
              }
              style={{ height: ROW_PX }}
            >
              {pitch % 12 === 0 && (
                <span className="block text-right pr-1 text-[9px] leading-[12px] text-slate-500">{noteName(pitch)}</span>
              )}
            </div>
          ))}
        </div>

        <div className="relative">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className={cn('block select-none touch-none', editable && 'cursor-crosshair')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerDown={handleGridPointerDown}
            onDoubleClick={handleDoubleClick}
          >
            {pitches.map((pitch) =>
              isBlackKey(pitch) ? (
                <rect
                  key={pitch}
                  x={0}
                  y={y(pitch)}
                  width={width}
                  height={ROW_PX}
                  className="fill-slate-100 dark:fill-[#151a2e]"
                />
              ) : null,
            )}
            {Array.from({ length: totalBeats * sub + 1 }, (_, i) => (
              <line
                key={i}
                x1={(i / sub) * PX_PER_BEAT}
                x2={(i / sub) * PX_PER_BEAT}
                y1={0}
                y2={height}
                className={
                  i % (bpb * sub) === 0
                    ? 'stroke-slate-400 dark:stroke-slate-500'
                    : i % sub === 0
                      ? 'stroke-slate-200 dark:stroke-slate-700'
                      : 'stroke-slate-100 dark:stroke-slate-800'
                }
                strokeWidth={1}
                strokeDasharray={i % sub === 0 ? undefined : '2 3'}
              />
            ))}
            {/* Selected notes are drawn last, over any note they overlap. */}
            {shown
              .map((note, index) => ({ note, index }))
              .sort((a, b) => Number(selectedSet.has(a.index)) - Number(selectedSet.has(b.index)))
              .map(({ note, index }) => {
                const left = x(note.startTimeSeconds) + 0.5
                const noteWidth = Math.max(3, x(note.durationSeconds) - 1)
                const isSelected = selectedSet.has(index)
                return (
                  <g key={index}>
                    <rect
                      data-note={index}
                      role={editable ? 'button' : undefined}
                      aria-label={`${noteName(note.pitchMidi)}, compás ${Math.floor(note.startTimeSeconds / beat / bpb) + 1}`}
                      aria-pressed={editable ? isSelected : undefined}
                      x={left}
                      y={y(note.pitchMidi) + 1}
                      width={noteWidth}
                      height={ROW_PX - 2}
                      rx={2}
                      className={cn(
                        isSelected ? 'fill-amber-500' : 'fill-indigo-500',
                        editable && 'cursor-grab active:cursor-grabbing',
                      )}
                      stroke={isSelected ? 'currentColor' : undefined}
                      fillOpacity={isSelected ? 1 : 0.45 + 0.55 * note.amplitude}
                      onPointerDown={(event) => handleNotePointerDown(event, index, 'move')}
                    >
                      {editable && (
                        <title>{`${noteName(note.pitchMidi)} — clic elige, Shift/Ctrl+clic suma, arrastrá para mover, doble clic borra`}</title>
                      )}
                    </rect>
                    {editable && (
                      <rect
                        data-note={index}
                        data-handle="resize"
                        aria-label={`Estirar ${noteName(note.pitchMidi)}`}
                        x={left + noteWidth - Math.min(HANDLE_PX, noteWidth / 2)}
                        y={y(note.pitchMidi) + 1}
                        width={Math.min(HANDLE_PX, noteWidth / 2)}
                        height={ROW_PX - 2}
                        className="fill-transparent cursor-ew-resize"
                        onPointerDown={(event) => handleNotePointerDown(event, index, 'resize')}
                      />
                    )}
                  </g>
                )
              })}
            {marquee && (
              <rect
                aria-label="Recuadro de selección"
                x={marquee.x}
                y={marquee.y}
                width={marquee.width}
                height={marquee.height}
                className="fill-indigo-500/10 stroke-indigo-500 pointer-events-none"
                strokeDasharray="4 3"
              />
            )}
          </svg>
          <div
            ref={playheadRef}
            aria-hidden
            className="absolute top-0 left-0 h-full w-0.5 bg-red-500 pointer-events-none"
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </div>
  )
}
