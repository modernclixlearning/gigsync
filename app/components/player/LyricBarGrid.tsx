/**
 * LyricBarGrid Component
 *
 * Renders a sung lyric line as a bar-based grid.
 * Each cell = one bar: chord badge (top) + lyric text (bottom).
 *
 * When `isEditable`:
 *  - Chord badges are sortable via long-press drag (dnd-kit).
 *  - Cell borders show resize handles: drag to extend/shrink beats.
 *  - Double-click a cell to subdivide it into two halves.
 */

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
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
import type { ChordPosition, LyricParsedLine } from '~/lib/chordpro'
import { transposeChord } from '~/lib/chordpro'
import { useChordResize } from './useChordResize'

interface LyricBarGridProps {
  line: LyricParsedLine
  columns?: number
  transpose?: number
  elementId: string
  className?: string
  onChordClick?: (elementId: string, chordIndex: number | null) => void
  isSeekEnabled?: boolean
  /** When true, chord badges are draggable (long-press). */
  isEditable?: boolean
  /**
   * Called after a drag-and-drop reorder with the updated chords array.
   * Chord NAMES are shuffled; their `position` values follow the sorted order
   * so the serialised ChordPro stays valid.
   */
  onChordsReorder?: (chords: ChordPosition[]) => void
  /** Minimum beat resolution for extend/subdivide operations. Default 0.25. */
  gridResolution?: number
  /** Default beats per chord when `beats` is undefined. Default 4. */
  defaultBeatsPerChord?: number
}

interface BarSegment {
  chord: string
  text: string
}

function splitIntoBarSegments(line: LyricParsedLine, transpose: number): BarSegment[] {
  const { text, chords } = line
  return chords.map((chordPos, i) => {
    const startPos = chordPos.position
    const endPos = i + 1 < chords.length ? chords[i + 1].position : text.length
    const segText = text.slice(startPos, endPos).trim()
    const chord = transpose !== 0 ? transposeChord(chordPos.chord, transpose) : chordPos.chord
    return { chord, text: segText }
  })
}

// ── Sortable chord badge ───────────────────────────────────────────────────────

function SortableChordBadge({ id, chord }: { id: string; chord: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 leading-none',
        'touch-none select-none cursor-grab active:cursor-grabbing',
        'rounded px-0.5',
        isDragging
          ? 'opacity-30'
          : 'hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
      )}
    >
      {chord}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function LyricBarGrid({
  line,
  columns = 4,
  transpose = 0,
  elementId,
  className,
  onChordClick,
  isSeekEnabled = false,
  isEditable = false,
  onChordsReorder,
  gridResolution = 0.25,
  defaultBeatsPerChord = 4,
}: LyricBarGridProps) {
  const segments = splitIntoBarSegments(line, transpose)
  const [activeId, setActiveId] = useState<string | null>(null)

  // ── Beat values for each chord ──────────────────────────────────────────────
  const chordBeats = line.chords.map(c => c.beats ?? defaultBeatsPerChord)

  // ── Resize (edge-drag) ──────────────────────────────────────────────────────
  const handleResizeComplete = useCallback(
    (newBeats: number[]) => {
      const newChords = line.chords.map((c, i) => ({ ...c, beats: newBeats[i] }))
      onChordsReorder?.(newChords)
    },
    [line.chords, onChordsReorder]
  )

  const { dragState, handlePointerDown, handlePointerMove, handlePointerUp } =
    useChordResize({
      beats: chordBeats,
      gridResolution,
      onResize: handleResizeComplete,
    })

  // ── Subdivide (double-click) ────────────────────────────────────────────────
  const handleDoubleClick = useCallback(
    (index: number) => {
      if (!isEditable) return
      const chords = line.chords
      const cell = chords[index]
      const cellBeats = cell.beats ?? defaultBeatsPerChord
      const halfBeats = cellBeats / 2
      if (halfBeats < gridResolution) return

      const nextPos = index + 1 < chords.length
        ? chords[index + 1].position
        : line.text.length
      const midPos = Math.round((cell.position + nextPos) / 2)

      const newCell: ChordPosition = { chord: cell.chord, position: midPos, beats: halfBeats }
      const newChords = [
        ...chords.slice(0, index),
        { ...cell, beats: halfBeats },
        newCell,
        ...chords.slice(index + 1),
      ]
      onChordsReorder?.(newChords)
    },
    [isEditable, line.chords, line.text.length, defaultBeatsPerChord, gridResolution, onChordsReorder]
  )

  // ── Cell click (seek in player mode) ────────────────────────────────────────
  const handleCellClick = (index: number) => {
    if (isSeekEnabled && !isEditable) {
      onChordClick?.(elementId, index)
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 500, tolerance: 8 } })
  )

  if (segments.length === 0) return null

  const effectiveCols = Math.min(columns, segments.length)
  const remainder = segments.length % effectiveCols
  const emptyCells = remainder === 0 ? 0 : effectiveCols - remainder

  const sortableIds = segments.map((_, i) => `lyric-${elementId}-${i}`)
  const activeChord = activeId
    ? segments[sortableIds.indexOf(activeId)]?.chord
    : null

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = sortableIds.indexOf(active.id as string)
    const newIdx = sortableIds.indexOf(over.id as string)
    if (oldIdx === -1 || newIdx === -1) return

    // Reorder chord NAMES while keeping positions sorted by character offset.
    const chordNames = segments.map((s) => s.chord)
    const reorderedNames = arrayMove(chordNames, oldIdx, newIdx)
    const sortedPositions = [...line.chords]
      .sort((a, b) => a.position - b.position)
      .map((c) => c.position)
    const newChords: ChordPosition[] = reorderedNames.map((chord, i) => ({
      chord,
      position: sortedPositions[i],
    }))
    onChordsReorder?.(newChords)
  }

  // ── Grid template: proportional widths based on beats ───────────────────────
  const displayBeats = dragState ? dragState.beats : chordBeats
  const gridTemplate = isEditable
    ? displayBeats.map(b => `${b}fr`).join(' ')
    : `repeat(${effectiveCols}, minmax(0, 1fr))`

  const grid = (
    <div
      data-resize-container
      className="grid gap-0"
      style={{ gridTemplateColumns: gridTemplate }}
      onPointerMove={dragState ? handlePointerMove : undefined}
      onPointerUp={dragState ? handlePointerUp : undefined}
    >
      {segments.map((seg, index) => {
        const isLast = index === segments.length - 1
        return (
          <div
            key={index}
            data-chord-index={index}
            className="relative flex"
          >
            {/* Cell content */}
            <div
              role={!isEditable && isSeekEnabled ? 'button' : undefined}
              tabIndex={!isEditable && isSeekEnabled ? 0 : undefined}
              onClick={() => handleCellClick(index)}
              onDoubleClick={() => handleDoubleClick(index)}
              className={cn(
                'flex flex-col gap-1 flex-1 min-w-0',
                'rounded-lg border',
                'bg-white dark:bg-slate-800',
                'border-slate-200 dark:border-slate-700',
                'px-2 py-2',
                'transition-colors duration-150',
                isSeekEnabled && !isEditable && 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
              )}
            >
              {/* Chord badge — sortable when editable */}
              {isEditable ? (
                <SortableChordBadge id={sortableIds[index]} chord={seg.chord} />
              ) : (
                <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 leading-none">
                  {seg.chord}
                </span>
              )}
              {/* Lyric text — never draggable */}
              <span className="text-slate-900 dark:text-white leading-snug whitespace-pre-wrap break-words">
                {seg.text || '\u00a0'}
              </span>
            </div>

            {/* Resize handle between cells (not on last cell) */}
            {isEditable && !isLast && (
              <div
                onPointerDown={(e) => handlePointerDown(index, e)}
                className={cn(
                  'absolute right-0 top-0 bottom-0 w-2 -mr-1 z-10',
                  'cursor-col-resize',
                  'flex items-center justify-center',
                  'group'
                )}
              >
                <div
                  className={cn(
                    'w-0.5 h-2/3 rounded-full transition-colors',
                    'bg-slate-300 dark:bg-slate-600',
                    'group-hover:bg-indigo-400 dark:group-hover:bg-indigo-500',
                    'group-active:bg-indigo-500 dark:group-active:bg-indigo-400',
                  )}
                />
              </div>
            )}
          </div>
        )
      })}

      {!isEditable && Array.from({ length: emptyCells }, (_, i) => (
        <div
          key={`pad-${i}`}
          className={cn(
            'rounded-lg border border-dashed',
            'border-slate-200 dark:border-slate-700',
            'py-2 px-1 opacity-25'
          )}
        />
      ))}
    </div>
  )

  return (
    <div
      data-element-id={elementId}
      data-bar-element
      className={cn(
        'rounded-xl border overflow-hidden',
        'bg-slate-50 dark:bg-slate-900/40',
        'border-slate-200 dark:border-slate-700',
        isEditable && 'ring-1 ring-amber-300 dark:ring-amber-700/50',
        className
      )}
    >
      <div className="p-2">
        {isEditable ? (
          <DndContext
            sensors={sensors}
            onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
              {grid}
            </SortableContext>
            <DragOverlay>
              {activeChord && (
                <span className="font-mono font-bold text-sm px-2 py-1 rounded bg-indigo-600 text-white shadow-lg">
                  {activeChord}
                </span>
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          grid
        )}
      </div>
    </div>
  )
}
