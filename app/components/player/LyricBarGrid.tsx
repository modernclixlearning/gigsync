/**
 * LyricBarGrid Component
 *
 * Renders a sung lyric line as a bar-based grid.
 * Each cell = one bar: chord badge (top) + lyric text (bottom).
 *
 * When `isEditable`, chord badges become sortable via long-press drag.
 * The lyric text cells stay fixed; only the chord NAMES reorder across them.
 */

import { useState } from 'react'
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
}: LyricBarGridProps) {
  const segments = splitIntoBarSegments(line, transpose)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedChordIndex, setSelectedChordIndex] = useState<number | null>(null)

  const handleCellClick = (index: number) => {
    if (isEditable) {
      setSelectedChordIndex((prev) => (prev === index ? null : index))
      return
    }
    if (isSeekEnabled) {
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
    // 1. Extract chord names in new visual order.
    const chordNames = segments.map((s) => s.chord)
    const reorderedNames = arrayMove(chordNames, oldIdx, newIdx)
    // 2. Get positions sorted by value (they must stay in ascending order).
    const sortedPositions = [...line.chords]
      .sort((a, b) => a.position - b.position)
      .map((c) => c.position)
    // 3. Zip new names onto sorted positions.
    const newChords: ChordPosition[] = reorderedNames.map((chord, i) => ({
      chord,
      position: sortedPositions[i],
    }))
    onChordsReorder?.(newChords)
  }

  const grid = (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))` }}
    >
      {segments.map((seg, index) => {
        const isSelected = isEditable && selectedChordIndex === index
        return (
          <div
            key={index}
            data-chord-index={index}
            role={isEditable || (isSeekEnabled && !isEditable) ? 'button' : undefined}
            tabIndex={isEditable || (isSeekEnabled && !isEditable) ? 0 : undefined}
            onClick={() => handleCellClick(index)}
            className={cn(
              'flex flex-col gap-1',
              'rounded-lg border',
              'bg-white dark:bg-slate-800',
              'border-slate-200 dark:border-slate-700',
              'px-2 py-2',
              'transition-colors duration-150',
              isEditable && 'cursor-pointer',
              isSeekEnabled && !isEditable && 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
              isSelected && 'ring-2 ring-indigo-500 dark:ring-indigo-400 border-indigo-300 dark:border-indigo-600'
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
        )
      })}

      {Array.from({ length: emptyCells }, (_, i) => (
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
      onClick={(e) => {
        // Clear selection when clicking outside a cell (on the container itself)
        if (isEditable && e.target === e.currentTarget) setSelectedChordIndex(null)
      }}
    >
      {/* Extend / Subdivide toolbar — visible when a cell is selected in editor mode */}
      {isEditable && selectedChordIndex !== null && (
        <div className="flex gap-2 px-2 pt-2">
          <button
            disabled
            title="Extender duración (próximamente)"
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium',
              'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500',
              'border border-slate-200 dark:border-slate-700',
              'cursor-not-allowed opacity-60'
            )}
          >
            + Extender
          </button>
          <button
            disabled
            title="Subdividir celda (próximamente)"
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium',
              'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500',
              'border border-slate-200 dark:border-slate-700',
              'cursor-not-allowed opacity-60'
            )}
          >
            ÷ Subdividir
          </button>
        </div>
      )}
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
