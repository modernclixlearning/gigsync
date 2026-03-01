/**
 * ChordEditor — Drag-and-drop chord editor
 *
 * Displays the song as an editable beat timeline.
 * Each chord is draggable (long-press to pick up, Android-style).
 * Drop zones are half-beat slots in a beat grid.
 *
 * Supported line types:
 *   - chords-only  → full beat grid
 *   - instrumental → full beat grid with section header
 *   - lyric        → sortable chord chips above the lyric text
 *   - section      → non-editable label
 *   - empty        → spacer
 */

import { useCallback, useMemo, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '~/lib/utils'
import { parseChordPro, isValidChord } from '~/lib/chordpro'
import { serializeParsedSong } from '~/lib/chordpro/serializer'
import type {
  AnyParsedLine,
  ChordBar,
  ChordsOnlyLine,
  InstrumentalLine,
  LyricParsedLine,
} from '~/lib/chordpro'

// ============================================================================
// Types
// ============================================================================

/** Half-beat slot identifier: `${lineIdx}:${slotIdx}` */
type SlotId = string
/** Draggable chord identifier: `chord:${lineIdx}:${chordIdx}` */
type ChordDragId = string

interface ChordSlot {
  slot: number      // half-beat index (0-based)
  chord: string
}

// ============================================================================
// Beat math helpers
// ============================================================================

function parseBeatsPerBar(timeSignature: string): number {
  const [num] = timeSignature.split('/').map(Number)
  return num || 4
}

/** Convert ChordBar[] to slot positions. Each half-beat = 0.5 beats. */
function chordBarsToSlots(bars: ChordBar[], beatsPerBar: number): ChordSlot[] {
  let cursor = 0
  return bars.map((bar) => {
    const slot: ChordSlot = { slot: cursor, chord: bar.chord }
    cursor += (bar.beats ?? beatsPerBar) * 2 // half-beats
    return slot
  })
}

/** Total half-beat slots for a set of bars. */
function totalSlotsForBars(bars: ChordBar[], beatsPerBar: number): number {
  return bars.reduce((sum, b) => sum + (b.beats ?? beatsPerBar) * 2, 0)
}

/** Convert slot positions back to ChordBar[] with computed beat durations. */
function slotsToChordBars(
  slots: ChordSlot[],
  beatsPerBar: number,
  totalSlots: number
): ChordBar[] {
  return slots.map((s, i) => {
    const nextSlot = i + 1 < slots.length ? slots[i + 1].slot : totalSlots
    const durationHalfBeats = Math.max(1, nextSlot - s.slot)
    const beats = durationHalfBeats / 2
    return {
      chord: s.chord,
      // Omit beats when it equals a full bar (keeps output clean)
      ...(beats !== beatsPerBar ? { beats } : {}),
    }
  })
}

// ============================================================================
// Draggable chord chip
// ============================================================================

function DraggableChip({
  id,
  chord,
  isActive,
}: {
  id: ChordDragId
  chord: string
  isActive: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'touch-none select-none cursor-grab active:cursor-grabbing',
        'font-mono font-bold text-xs px-2 py-1 rounded-md border',
        'transition-all duration-150',
        isDragging
          ? 'opacity-40 scale-95'
          : isActive
          ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105'
          : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700 shadow-sm hover:shadow-md hover:border-indigo-500'
      )}
      style={{ transform: CSS.Translate.toString(transform) }}
    >
      {chord}
    </div>
  )
}

// ============================================================================
// Half-beat drop slot
// ============================================================================

function BeatSlot({
  id,
  beatLabel,
  isBarStart,
  chord,
  chordDragId,
  activeChordId,
}: {
  id: SlotId
  beatLabel?: string
  isBarStart: boolean
  chord?: string
  chordDragId?: ChordDragId
  activeChordId: ChordDragId | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative flex flex-col items-center min-w-[2.25rem] h-16 border-r',
        isBarStart
          ? 'border-r-slate-300 dark:border-r-slate-600 border-l border-l-slate-400 dark:border-l-slate-500'
          : 'border-r-slate-200 dark:border-r-slate-700/60',
        isOver && !chord
          ? 'bg-indigo-100 dark:bg-indigo-900/40'
          : 'bg-transparent'
      )}
    >
      {/* Beat label (shown on beat starts only) */}
      {beatLabel && (
        <span
          className={cn(
            'absolute top-0.5 left-0 right-0 text-center text-[9px] leading-none select-none',
            isBarStart
              ? 'text-slate-500 dark:text-slate-400 font-semibold'
              : 'text-slate-400 dark:text-slate-600'
          )}
        >
          {beatLabel}
        </span>
      )}

      {/* Chord chip (if this slot has a chord) */}
      {chord && chordDragId && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2">
          <DraggableChip
            id={chordDragId}
            chord={chord}
            isActive={activeChordId === chordDragId}
          />
        </div>
      )}

      {/* Drop indicator when hovering over empty slot */}
      {isOver && !chord && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-8 h-6 rounded border-2 border-dashed border-indigo-400 dark:border-indigo-500" />
      )}
    </div>
  )
}

// ============================================================================
// Beat grid for a single line
// ============================================================================

interface BeatGridProps {
  lineIdx: number
  bars: ChordBar[]
  beatsPerBar: number
  onChange: (bars: ChordBar[]) => void
}

function BeatGrid({ lineIdx, bars, beatsPerBar, onChange }: BeatGridProps) {
  const [activeChordId, setActiveChordId] = useState<ChordDragId | null>(null)

  const halfBeatsPerBar = beatsPerBar * 2
  const slots = useMemo(() => chordBarsToSlots(bars, beatsPerBar), [bars, beatsPerBar])
  const totalSlots = useMemo(() => totalSlotsForBars(bars, beatsPerBar), [bars, beatsPerBar])
  // Ensure we show at least 1 bar worth of slots even when empty
  const displaySlots = Math.max(totalSlots, halfBeatsPerBar)

  // Build slot → chord lookup
  const slotMap = useMemo(() => {
    const map = new Map<number, { chord: string; chordIdx: number }>()
    slots.forEach((s, i) => map.set(s.slot, { chord: s.chord, chordIdx: i }))
    return map
  }, [slots])

  // Sensors: long-press (500ms) + small tolerance to avoid accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 500, tolerance: 8 },
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveChordId(event.active.id as ChordDragId)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveChordId(null)
      const { active, over } = event
      if (!over) return

      // Parse IDs
      // chordDragId: `chord:${lineIdx}:${chordIdx}`
      // slotId:       `slot:${lineIdx}:${slotIdx}`
      const [, , chordIdxStr] = (active.id as string).split(':')
      const [, , slotIdxStr] = (over.id as string).split(':')
      const chordIdx = parseInt(chordIdxStr, 10)
      const targetSlot = parseInt(slotIdxStr, 10)

      if (isNaN(chordIdx) || isNaN(targetSlot)) return

      // Move chord to new slot
      const newSlots = slots.map((s, i) =>
        i === chordIdx ? { ...s, slot: targetSlot } : s
      )
      // Sort by slot position
      newSlots.sort((a, b) => a.slot - b.slot)
      // Re-compute bars
      const newBars = slotsToChordBars(newSlots, beatsPerBar, displaySlots)
      onChange(newBars)
    },
    [slots, beatsPerBar, displaySlots, onChange]
  )

  // Which chord is being dragged (for overlay)
  const activeSlot = activeChordId
    ? slots.find((_, i) => `chord:${lineIdx}:${i}` === activeChordId)
    : null

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Horizontal scrollable beat timeline */}
      <div className="overflow-x-auto pb-1">
        <div className="flex" style={{ minWidth: `${displaySlots * 2.25}rem` }}>
          {Array.from({ length: displaySlots }, (_, slotIdx) => {
            const beatInBar = slotIdx % halfBeatsPerBar
            const isBarStart = beatInBar === 0
            const beatNum = Math.floor(beatInBar / 2) + 1
            const isHalfBeat = beatInBar % 2 === 1

            // Beat label: "1", "1½", "2", "2½", ...
            let beatLabel: string | undefined
            if (isBarStart) {
              beatLabel = `${beatNum}`
            } else if (isHalfBeat) {
              beatLabel = `${beatNum}½`
            }

            const entry = slotMap.get(slotIdx)
            const slotId: SlotId = `slot:${lineIdx}:${slotIdx}`
            const chordDragId: ChordDragId | undefined = entry
              ? `chord:${lineIdx}:${entry.chordIdx}`
              : undefined

            return (
              <BeatSlot
                key={slotIdx}
                id={slotId}
                beatLabel={beatLabel}
                isBarStart={isBarStart}
                chord={entry?.chord}
                chordDragId={chordDragId}
                activeChordId={activeChordId}
              />
            )
          })}
        </div>
      </div>

      {/* Drag overlay (floating chip while dragging) */}
      <DragOverlay>
        {activeSlot && (
          <div className="font-mono font-bold text-xs px-2 py-1 rounded-md border bg-indigo-600 text-white border-indigo-600 shadow-xl scale-110">
            {activeSlot.chord}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

// ============================================================================
// Sortable chord chip (for lyric lines — reorder within line)
// ============================================================================

function SortableChordChip({ id, chord }: { id: string; chord: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'touch-none select-none cursor-grab active:cursor-grabbing',
        'font-mono font-bold text-xs px-2 py-1 rounded-md border',
        'transition-colors duration-150',
        isDragging
          ? 'opacity-40'
          : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700 shadow-sm'
      )}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {chord}
    </div>
  )
}

// ============================================================================
// Editable lyric line (sortable chord reordering)
// ============================================================================

interface EditableLyricLineProps {
  lineIdx: number
  line: LyricParsedLine
  onChange: (line: LyricParsedLine) => void
}

function EditableLyricLine({ lineIdx, line, onChange }: EditableLyricLineProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 500, tolerance: 8 },
    })
  )

  const chordIds = line.chords.map((_, i) => `lyric:${lineIdx}:${i}`)

  const handleSortEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = chordIds.indexOf(active.id as string)
      const newIndex = chordIds.indexOf(over.id as string)
      if (oldIndex === -1 || newIndex === -1) return
      const newChords = arrayMove(line.chords, oldIndex, newIndex)
      onChange({ ...line, chords: newChords })
    },
    [chordIds, line, onChange]
  )

  return (
    <div className="py-2 space-y-2">
      <DndContext sensors={sensors} onDragEnd={handleSortEnd}>
        <SortableContext items={chordIds} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap gap-1.5">
            {line.chords.map((cp, i) => (
              <SortableChordChip
                key={chordIds[i]}
                id={chordIds[i]}
                chord={cp.chord}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
        {line.text}
      </p>
    </div>
  )
}

// ============================================================================
// Add-chord mini form
// ============================================================================

function AddChordButton({ onAdd }: { onAdd: (chord: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (trimmed && isValidChord(trimmed)) {
      onAdd(trimmed)
      setValue('')
      setEditing(false)
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-indigo-500 dark:text-indigo-400 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-md px-2 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
      >
        + acorde
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') { setEditing(false); setValue('') }
        }}
        placeholder="Am, G, C#m7…"
        className="text-xs font-mono w-24 px-2 py-1 rounded border border-indigo-400 dark:border-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <button
        onClick={handleSubmit}
        className="text-xs px-2 py-1 rounded bg-indigo-600 text-white"
      >
        ✓
      </button>
      <button
        onClick={() => { setEditing(false); setValue('') }}
        className="text-xs px-1 py-1 text-slate-400 hover:text-slate-600"
      >
        ✕
      </button>
    </div>
  )
}

// ============================================================================
// Chord remove button (shown inside a chip on long-press in edit mode)
// ============================================================================

function RemovableChordBadge({
  chord,
  onRemove,
}: {
  chord: string
  onRemove: () => void
}) {
  return (
    <div className="relative group/chip inline-flex">
      <span className="font-mono font-bold text-xs px-2 py-1 rounded-md border bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700 shadow-sm">
        {chord}
      </span>
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none hidden group-hover/chip:flex items-center justify-center shadow"
      >
        ×
      </button>
    </div>
  )
}

// ============================================================================
// Editable section for ChordsOnlyLine / InstrumentalLine
// ============================================================================

interface EditableBeatSectionProps {
  lineIdx: number
  label?: string
  labelColor?: string
  bars: ChordBar[]
  beatsPerBar: number
  onBarsChange: (bars: ChordBar[]) => void
}

function EditableBeatSection({
  lineIdx,
  label,
  labelColor = 'text-indigo-500 dark:text-indigo-400',
  bars,
  beatsPerBar,
  onBarsChange,
}: EditableBeatSectionProps) {
  const handleRemove = (chordIdx: number) => {
    const newBars = bars.filter((_, i) => i !== chordIdx)
    onBarsChange(newBars)
  }

  const handleAdd = (chord: string) => {
    onBarsChange([...bars, { chord }])
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 overflow-hidden mb-2">
      {/* Header with label */}
      {label && (
        <div className={cn('px-3 py-1.5 text-xs font-semibold uppercase tracking-wide border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60', labelColor)}>
          {label}
        </div>
      )}

      {/* Remove-badge row */}
      <div className="flex flex-wrap gap-1.5 px-3 pt-2">
        {bars.map((bar, i) => (
          <RemovableChordBadge
            key={i}
            chord={bar.chord}
            onRemove={() => handleRemove(i)}
          />
        ))}
        <AddChordButton onAdd={handleAdd} />
      </div>

      {/* Beat grid (drag-and-drop) */}
      <div className="px-3 pt-1 pb-2">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1 select-none">
          Mantené presionado un acorde para arrastrarlo al beat que necesitás
        </p>
        <BeatGrid
          lineIdx={lineIdx}
          bars={bars}
          beatsPerBar={beatsPerBar}
          onChange={onBarsChange}
        />
        {/* Bar ruler */}
        <BarRuler bars={bars} beatsPerBar={beatsPerBar} />
      </div>
    </div>
  )
}

/** Shows bar numbers below the beat grid */
function BarRuler({
  bars,
  beatsPerBar,
}: {
  bars: ChordBar[]
  beatsPerBar: number
}) {
  const halfBeatsPerBar = beatsPerBar * 2
  const totalSlots = Math.max(totalSlotsForBars(bars, beatsPerBar), halfBeatsPerBar)
  const numBars = Math.ceil(totalSlots / halfBeatsPerBar)

  return (
    <div className="flex mt-0.5" style={{ minWidth: `${totalSlots * 2.25}rem` }}>
      {Array.from({ length: numBars }, (_, i) => (
        <div
          key={i}
          className="text-[9px] text-slate-400 dark:text-slate-600 text-center select-none"
          style={{ width: `${halfBeatsPerBar * 2.25}rem` }}
        >
          compás {i + 1}
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Main ChordEditorOverlay
// ============================================================================

export interface ChordEditorOverlayProps {
  lyrics: string
  timeSignature?: string
  onSave: (newLyrics: string) => void
  onCancel: () => void
  isSaving?: boolean
}

export function ChordEditorOverlay({
  lyrics,
  timeSignature = '4/4',
  onSave,
  onCancel,
  isSaving = false,
}: ChordEditorOverlayProps) {
  const beatsPerBar = parseBeatsPerBar(timeSignature)

  // Parse the song once on mount; local edits stored as mutable copy
  const initialParsed = useMemo(() => parseChordPro(lyrics), [lyrics])
  const [lines, setLines] = useState<AnyParsedLine[]>(() => initialParsed.lines)

  const updateLine = useCallback((idx: number, updated: AnyParsedLine) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? updated : l)))
  }, [])

  const handleSave = () => {
    const newLyrics = serializeParsedSong(lines)
    onSave(newLyrics)
  }

  const isDirty = useMemo(() => {
    return serializeParsedSong(lines) !== serializeParsedSong(initialParsed.lines)
  }, [lines, initialParsed.lines])

  return (
    <div className="flex flex-col gap-0">
      {/* Editor toolbar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-2">
          <span className="text-amber-600 dark:text-amber-400 text-sm font-semibold">
            ✏️ Editando acordes
          </span>
          {isDirty && (
            <span className="text-[10px] text-amber-500 dark:text-amber-500 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
              sin guardar
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              'text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors',
              isDirty
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-indigo-200 dark:bg-indigo-900/50 text-indigo-400 dark:text-indigo-600 cursor-default'
            )}
          >
            {isSaving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Line editors */}
      <div className="px-4 py-4 space-y-1">
        {lines.map((line, idx) => {
          if (line.type === 'empty') {
            return <div key={idx} className="h-4" />
          }

          if (line.type === 'section') {
            return (
              <div key={idx} className="pt-4 pb-1">
                <h3 className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">
                  {line.name}
                </h3>
              </div>
            )
          }

          if (line.type === 'directive') {
            return null
          }

          if (line.type === 'chords-only') {
            return (
              <EditableBeatSection
                key={idx}
                lineIdx={idx}
                bars={line.chordBars}
                beatsPerBar={beatsPerBar}
                onBarsChange={(newBars) =>
                  updateLine(idx, {
                    ...line,
                    chordBars: newBars,
                  } as ChordsOnlyLine)
                }
              />
            )
          }

          if (line.type === 'instrumental') {
            return (
              <EditableBeatSection
                key={idx}
                lineIdx={idx}
                label={line.section.name}
                bars={line.section.chordBars}
                beatsPerBar={beatsPerBar}
                onBarsChange={(newBars) =>
                  updateLine(idx, {
                    ...line,
                    section: {
                      ...line.section,
                      chordBars: newBars,
                      bars: Math.ceil(
                        totalSlotsForBars(newBars, beatsPerBar) / (beatsPerBar * 2)
                      ),
                    },
                  } as InstrumentalLine)
                }
              />
            )
          }

          if (line.type === 'lyric') {
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 mb-1"
              >
                <EditableLyricLine
                  lineIdx={idx}
                  line={line}
                  onChange={(updated) => updateLine(idx, updated as LyricParsedLine)}
                />
              </div>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}
