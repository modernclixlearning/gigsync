import { useEffect, useRef } from 'react'
import { isBlackKey, noteName, pitchRange } from '~/lib/midi/pianoRoll'
import { beatSeconds } from '~/lib/midi/recording'
import type { ChordProgression, NoteEvent } from '~/lib/audioAnalysis/types'

const PX_PER_BEAT = 48
const ROW_PX = 12
const KEYS_PX = 44
const CHORD_ROW_PX = 28

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
  /** When set, clicking a note deletes it. */
  onDeleteNote?: (index: number) => void
}

/**
 * The take as a piano roll: one row per semitone (keyboard on the left), the
 * click's bars and beats as the grid, the detected chords on top. Scrolls
 * sideways and follows the playhead while it moves.
 */
export function PianoRoll({
  notes,
  bpm,
  beatsPerBar,
  durationSeconds,
  progression,
  getPlayhead,
  onDeleteNote,
}: PianoRollProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)

  const beat = beatSeconds(bpm)
  const bpb = Math.max(1, Math.round(beatsPerBar))
  const notesEnd = notes.reduce((end, n) => Math.max(end, n.startTimeSeconds + n.durationSeconds), 0)
  const bars = Math.max(1, Math.ceil(Math.max(durationSeconds, notesEnd) / (beat * bpb) - 1e-6))
  const totalBeats = bars * bpb
  const width = totalBeats * PX_PER_BEAT
  const { low, high } = pitchRange(notes)
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

  const cells = (progression?.bars ?? []).flatMap((bar) => bar.cells).filter((cell) => cell.chord)

  return (
    <div
      ref={scrollRef}
      role="region"
      aria-label="Carrete MIDI"
      className="h-full overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1f36]"
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
          <svg width={width} height={height} className="block">
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
            {Array.from({ length: totalBeats + 1 }, (_, i) => (
              <line
                key={i}
                x1={i * PX_PER_BEAT}
                x2={i * PX_PER_BEAT}
                y1={0}
                y2={height}
                className={
                  i % bpb === 0 ? 'stroke-slate-400 dark:stroke-slate-500' : 'stroke-slate-200 dark:stroke-slate-700'
                }
                strokeWidth={1}
              />
            ))}
            {notes.map((note, index) => (
              <rect
                key={index}
                role={onDeleteNote ? 'button' : undefined}
                aria-label={`${noteName(note.pitchMidi)}, compás ${Math.floor(note.startTimeSeconds / beat / bpb) + 1}`}
                x={x(note.startTimeSeconds) + 0.5}
                y={y(note.pitchMidi) + 1}
                width={Math.max(3, x(note.durationSeconds) - 1)}
                height={ROW_PX - 2}
                rx={2}
                className={
                  onDeleteNote
                    ? 'fill-indigo-500 hover:fill-red-500 cursor-pointer'
                    : 'fill-indigo-500'
                }
                fillOpacity={0.45 + 0.55 * note.amplitude}
                onClick={onDeleteNote ? () => onDeleteNote(index) : undefined}
              >
                {onDeleteNote && <title>{`${noteName(note.pitchMidi)} — clic para borrar`}</title>}
              </rect>
            ))}
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
