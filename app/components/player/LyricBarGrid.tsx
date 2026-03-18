/**
 * LyricBarGrid Component
 *
 * Renders a sung lyric line as a bar-based grid.
 * Each cell = one bar: chord badge (top) + lyric text (bottom).
 *
 * When `isEditable`:
 *  - Long-press or right-click a cell to open bubble menu (Edit / Delete).
 *  - Chord badges are sortable via long-press drag (dnd-kit).
 *  - Cell borders show resize handles: drag to extend/shrink beats.
 *  - Double-click a cell to subdivide it into two halves.
 *  - '+' button to add new chord cell.
 */

import { useState, useCallback, useRef, useMemo } from 'react'
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
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '~/lib/utils'
import type { ChordPosition, LyricParsedLine } from '~/lib/chordpro'
import { transposeChord } from '~/lib/chordpro'
import { useChordResize } from './useChordResize'
import { ChordPicker } from './ChordPicker'
import { InlineTextEditor } from './InlineTextEditor'
import { useBubbleMenu } from './useBubbleMenu'
import { BubbleMenu } from './BubbleMenu'
import type { BubbleMenuAction } from './BubbleMenu'

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
  /** Called when the lyric text of this line changes. */
  onTextChange?: (newText: string, newChords: ChordPosition[]) => void
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
      data-sortable-handle
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
  onTextChange,
  gridResolution = 0.25,
  defaultBeatsPerChord = 4,
}: LyricBarGridProps) {
  const segments = splitIntoBarSegments(line, transpose)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingChordIndex, setEditingChordIndex] = useState<number | null>(null)
  const chordPickerRef = useRef<HTMLDivElement>(null)

  // ── Bubble menu ───────────────────────────────────────────────────────────────
  const bubbleMenu = useBubbleMenu({ isEnabled: isEditable })

  const bubbleMenuActions = useMemo((): BubbleMenuAction[] => {
    const idx = bubbleMenu.state.targetIndex
    return [
      {
        id: 'edit',
        label: 'Editar',
        icon: '✎',
        variant: 'default' as const,
        onAction: () => {
          setEditingChordIndex(idx)
          bubbleMenu.close()
        },
      },
      {
        id: 'delete',
        label: 'Eliminar',
        icon: '✕',
        variant: 'danger' as const,
        disabled: line.chords.length <= 1,
        onAction: () => {
          handleDeleteChord(idx)
          bubbleMenu.close()
        },
      },
    ]
  }, [bubbleMenu.state.targetIndex, line.chords.length])

  // ── Beat values for each chord ──────────────────────────────────────────────
  const chordBeats = line.chords.map(c => c.beats ?? defaultBeatsPerChord)

  // ── Chord name change ───────────────────────────────────────────────────────
  const handleChordChange = useCallback(
    (index: number, newChord: string) => {
      // Reverse transpose to store the original key chord
      const storedChord = transpose !== 0 ? transposeChord(newChord, -transpose) : newChord
      const newChords = line.chords.map((c, i) =>
        i === index ? { ...c, chord: storedChord } : c
      )
      onChordsReorder?.(newChords)
    },
    [line.chords, transpose, onChordsReorder]
  )

  // ── Add chord cell ──────────────────────────────────────────────────────────
  const handleAddChord = useCallback(() => {
    const lastChord = line.chords[line.chords.length - 1]
    const newPosition = line.text.length
    const newChord: ChordPosition = {
      chord: lastChord?.chord ?? 'C',
      position: newPosition,
      beats: defaultBeatsPerChord,
    }
    onChordsReorder?.([...line.chords, newChord])
  }, [line.chords, line.text.length, defaultBeatsPerChord, onChordsReorder])

  // ── Delete chord cell ───────────────────────────────────────────────────────
  const handleDeleteChord = useCallback(
    (index: number) => {
      if (line.chords.length <= 1) return // Keep at least one chord
      const newChords = line.chords.filter((_, i) => i !== index)
      onChordsReorder?.(newChords)
      setEditingChordIndex(null)
    },
    [line.chords, onChordsReorder]
  )

  // ── Lyric text change for a segment ─────────────────────────────────────────
  const handleSegmentTextChange = useCallback(
    (index: number, newText: string) => {
      // Rebuild the full text with updated segment + adjust chord positions
      const chords = [...line.chords]
      let fullText = ''
      for (let i = 0; i < chords.length; i++) {
        const segStart = fullText.length
        chords[i] = { ...chords[i], position: segStart }
        if (i === index) {
          fullText += newText
        } else {
          const origStart = line.chords[i].position
          const origEnd = i + 1 < line.chords.length ? line.chords[i + 1].position : line.text.length
          fullText += line.text.slice(origStart, origEnd)
        }
      }
      onTextChange?.(fullText, chords)
    },
    [line.chords, line.text, onTextChange]
  )

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
  const readGridTemplate = `repeat(${effectiveCols}, minmax(0, 1fr))`

  // ── Group segments into rows of `columns` for edit mode ─────────────────────
  const editRows: number[][] = []
  if (isEditable) {
    for (let i = 0; i < segments.length; i += effectiveCols) {
      editRows.push(
        Array.from({ length: Math.min(effectiveCols, segments.length - i) }, (_, j) => i + j)
      )
    }
  }

  const renderCell = (index: number, isLastInRow: boolean) => {
    const seg = segments[index]
    const cellBubbleHandlers = isEditable
      ? bubbleMenu.getHandlers(index, { enableLongPress: true })
      : {}
    return (
      <div
        key={index}
        data-chord-index={index}
        className="relative flex"
      >
        {/* Cell content */}
        <div
          role={!isEditable && isSeekEnabled ? 'button' : undefined}
          tabIndex={!isEditable && isSeekEnabled ? 0 : (isEditable ? 0 : undefined)}
          onClick={() => handleCellClick(index)}
          onDoubleClick={() => handleDoubleClick(index)}
          {...cellBubbleHandlers}
          className={cn(
            'flex flex-col gap-0.5 flex-1 min-w-0',
            'px-1 py-1',
            'transition-colors duration-150',
            isEditable
              ? 'rounded-lg border border-white/10 hover:border-white/25 bg-white/5'
              : 'rounded-md',
            isSeekEnabled && !isEditable && 'cursor-pointer hover:bg-white/5',
          )}
        >
          {/* Chord badge — sortable via long-press drag */}
          {isEditable ? (
            <div className="relative flex items-center gap-1">
              <SortableChordBadge id={sortableIds[index]} chord={seg.chord} />
              {/* Chord picker popover */}
              {editingChordIndex === index && (
                <div
                  ref={chordPickerRef}
                  className="absolute top-full left-0 mt-1 z-50"
                >
                  <ChordPicker
                    currentChord={seg.chord}
                    onSelect={(chord) => handleChordChange(index, chord)}
                    onClose={() => setEditingChordIndex(null)}
                  />
                </div>
              )}
            </div>
          ) : (
            <span className="font-mono font-bold text-[0.6em] text-sky-400/80 dark:text-sky-400/80 text-indigo-500 leading-none">
              {seg.chord}
            </span>
          )}
          {/* Lyric text — editable in edit mode */}
          <InlineTextEditor
            value={seg.text}
            isEditable={isEditable}
            onCommit={(newText) => handleSegmentTextChange(index, newText)}
            className="text-slate-900 dark:text-white font-semibold leading-snug"
            placeholder="Letra..."
          />
        </div>

        {/* Resize handle between cells (not on last in row) */}
        {isEditable && !isLastInRow && (
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
  }

  const editGrid = (
    <div
      className="flex flex-col gap-1"
      onPointerMove={dragState ? handlePointerMove : undefined}
      onPointerUp={dragState ? handlePointerUp : undefined}
    >
      {editRows.map((rowIndices, rowIndex) => {
        const rowBeats = rowIndices.map(i => displayBeats[i])
        const rowTemplate = rowBeats.map(b => `${b}fr`).join(' ')
        return (
          <div
            key={rowIndex}
            data-resize-container
            className="grid gap-1"
            style={{ gridTemplateColumns: rowTemplate }}
          >
            {rowIndices.map((segIndex, colIdx) =>
              renderCell(segIndex, colIdx === rowIndices.length - 1)
            )}
          </div>
        )
      })}

      {/* Add chord button */}
      <button
        onClick={handleAddChord}
        className={cn(
          'flex items-center justify-center',
          'rounded-lg border-2 border-dashed',
          'border-white/10 hover:border-white/25',
          'text-slate-400 dark:text-slate-500',
          'hover:text-indigo-400',
          'transition-colors min-h-[48px]',
          'px-3 py-2'
        )}
        aria-label="Agregar acorde"
      >
        <span className="text-lg">+</span>
      </button>
    </div>
  )

  const readGrid = (
    <div
      className="grid gap-x-1"
      style={{ gridTemplateColumns: readGridTemplate }}
    >
      {segments.map((seg, index) => renderCell(index, index === segments.length - 1))}

      {Array.from({ length: emptyCells }, (_, i) => (
        <div
          key={`pad-${i}`}
          className="py-1 px-1 opacity-0"
        />
      ))}
    </div>
  )

  return (
    <div
      data-element-id={elementId}
      data-bar-element
      className={cn(
        isEditable
          ? 'rounded-xl border border-white/10 bg-white/[0.03]'
          : 'py-1',
        className
      )}
    >
      <div className={isEditable ? 'p-2' : 'px-0 py-0'}>
        {isEditable ? (
          <DndContext
            sensors={sensors}
            onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
              {editGrid}
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
          readGrid
        )}
      </div>

      {/* Bubble menu (portal) */}
      {bubbleMenu.state.visible && bubbleMenu.state.anchorRect && (
        <BubbleMenu
          anchorRect={bubbleMenu.state.anchorRect}
          actions={bubbleMenuActions}
          onClose={bubbleMenu.close}
        />
      )}
    </div>
  )
}
