/**
 * LyricBarGrid Component
 *
 * Renders a sung lyric line as a bar-based grid.
 * Each cell = one bar: chord badge (top) + lyric text (bottom).
 *
 * When `isEditable`:
 *  - Long-press or right-click a cell to open bubble menu (Edit / Delete).
 *  - Chord badges are sortable via long-press drag (dnd-kit).
 *  - Cells sit on a fixed bar/beat grid (BeatGrid): a chord's width is its
 *    duration, and bar lines align across every row and line.
 *  - Each chord's right edge is a resize handle: drag to extend/shrink beats.
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
import { effectiveLyricChordBeats, type BeatGridSegment } from '~/lib/timeline/beatGrid'
import { useChordResize } from './useChordResize'
import { BeatGrid, BeatGridResizeHandle } from './BeatGrid'
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
  /** Beats per bar from the song's time signature. Default 4. */
  beatsPerBar?: number
  /** Bars the playback timeline gives a line whose chords lack explicit beats. Default 2. */
  defaultBarsPerLine?: number
  /** Font size (px) of the chord badge above each bar cell. Default 26. */
  chordFontSize?: number
}

interface BarSegment {
  chord: string
  text: string
}

// `line.chords[].chord` is already transposed (parseChordPro applies it
// upstream) — this only re-slices text around it, it must not transpose again.
function splitIntoBarSegments(line: LyricParsedLine): BarSegment[] {
  const { text, chords } = line
  return chords.map((chordPos, i) => {
    const startPos = chordPos.position
    const endPos = i + 1 < chords.length ? chords[i + 1].position : text.length
    const segText = text.slice(startPos, endPos).trim()
    return { chord: chordPos.chord, text: segText }
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
  beatsPerBar = 4,
  defaultBarsPerLine = 2,
  chordFontSize = 26,
}: LyricBarGridProps) {
  const segments = splitIntoBarSegments(line)
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
  // What playback actually uses, so the grid shows real durations. Any
  // structural edit writes them back explicitly (`withBeats`) so the line
  // keeps its rhythm instead of being re-split evenly.
  const chordBeats = effectiveLyricChordBeats(line.chords, beatsPerBar, defaultBarsPerLine)
  const withBeats = (chords: ChordPosition[]) =>
    chords.map((c, i) => ({ ...c, beats: chordBeats[i] }))

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
      beats: beatsPerBar,
    }
    onChordsReorder?.([...withBeats(line.chords), newChord])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line.chords, line.text.length, beatsPerBar, chordBeats.join(), onChordsReorder])

  // ── Delete chord cell ───────────────────────────────────────────────────────
  const handleDeleteChord = useCallback(
    (index: number) => {
      if (line.chords.length <= 1) return // Keep at least one chord
      const newChords = withBeats(line.chords).filter((_, i) => i !== index)
      onChordsReorder?.(newChords)
      setEditingChordIndex(null)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [line.chords, chordBeats.join(), onChordsReorder]
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

  const { dragState, handlePointerDown } =
    useChordResize({
      beats: chordBeats,
      gridResolution,
      beatsPerRow: columns * beatsPerBar,
      onResize: handleResizeComplete,
    })

  // ── Subdivide (double-click) ────────────────────────────────────────────────
  const handleDoubleClick = useCallback(
    (index: number) => {
      if (!isEditable) return
      const chords = withBeats(line.chords)
      const cell = chords[index]
      const halfBeats = cell.beats! / 2
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEditable, line.chords, line.text.length, chordBeats.join(), gridResolution, onChordsReorder]
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

    // Reorder chord NAMES only: each slot keeps its text offset and duration,
    // so moving a chord never changes the line's rhythm.
    const chordNames = line.chords.map((c) => c.chord)
    const reorderedNames = arrayMove(chordNames, oldIdx, newIdx)
    const slots = withBeats(line.chords)
    const newChords: ChordPosition[] = reorderedNames.map((chord, i) => ({
      ...slots[i],
      chord,
    }))
    onChordsReorder?.(newChords)
  }

  // ── Read grid: equal columns ────────────────────────────────────────────────
  const displayBeats = dragState ? dragState.beats : chordBeats
  const readGridTemplate = `repeat(${effectiveCols}, minmax(0, 1fr))`

  const renderCell = (index: number, isLastInRow: boolean) => {
    const seg = segments[index]
    return (
      <div
        key={index}
        data-chord-index={index}
        className={cn('relative flex', !isLastInRow && 'border-r border-white/[0.06]')}
      >
        <div
          role={isSeekEnabled ? 'button' : undefined}
          tabIndex={isSeekEnabled ? 0 : undefined}
          onClick={() => handleCellClick(index)}
          className={cn(
            'flex flex-col gap-0.5 flex-1 min-w-0',
            'px-1 py-1 rounded-md',
            'transition-colors duration-150',
            isSeekEnabled && 'cursor-pointer hover:bg-white/5',
          )}
        >
          <span className="font-mono font-bold text-sky-400/80 dark:text-sky-400/80 text-indigo-500 leading-none" style={{ fontSize: chordFontSize }}>
            {seg.chord}
          </span>
          <InlineTextEditor
            value={seg.text}
            onCommit={(newText) => handleSegmentTextChange(index, newText)}
            className="text-slate-900 dark:text-white font-semibold leading-snug"
          />
        </div>
      </div>
    )
  }

  // ── Edit grid: fixed bar/beat grid, each chord spans exactly its beats ─────
  const renderEditSegment = (s: BeatGridSegment) => {
    const index = s.index
    const seg = segments[index]
    const cellBubbleHandlers = bubbleMenu.getHandlers(index, { enableLongPress: true })
    const beats = displayBeats[index]
    return (
      <>
        <div
          data-chord-index={s.isHead ? index : undefined}
          tabIndex={s.isHead ? 0 : undefined}
          onDoubleClick={() => handleDoubleClick(index)}
          {...cellBubbleHandlers}
          className={cn(
            'm-0.5 flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden px-1.5 py-1',
            'rounded-md border transition-colors duration-150',
            s.isHead
              ? 'border-slate-300 bg-white/60 hover:border-indigo-300 dark:border-white/15 dark:bg-white/[0.04] dark:hover:border-white/30'
              : 'border-dashed border-slate-300 bg-transparent dark:border-white/10',
            dragState?.index === index && 'border-indigo-400 dark:border-indigo-500',
          )}
        >
          {s.isHead ? (
            <>
              <div className="relative flex items-center justify-between gap-1">
                <SortableChordBadge id={sortableIds[index]} chord={seg.chord} />
                <span
                  className="shrink-0 font-mono text-[10px] leading-none text-slate-400 dark:text-slate-500 tabular-nums"
                  title={`${beats} ${beats === 1 ? 'tiempo' : 'tiempos'}`}
                >
                  {beats}
                </span>
                {editingChordIndex === index && (
                  <div ref={chordPickerRef} className="absolute top-full left-0 mt-1 z-50">
                    <ChordPicker
                      currentChord={seg.chord}
                      onSelect={(chord) => handleChordChange(index, chord)}
                      onClose={() => setEditingChordIndex(null)}
                    />
                  </div>
                )}
              </div>
              <InlineTextEditor
                value={seg.text}
                isEditable
                onCommit={(newText) => handleSegmentTextChange(index, newText)}
                className="text-slate-900 dark:text-white font-semibold leading-snug"
                placeholder="Letra..."
              />
            </>
          ) : (
            <span className="font-mono text-sm font-bold leading-none text-indigo-400/60 dark:text-indigo-400/50">
              ↳ {seg.chord}
            </span>
          )}
        </div>

        {s.isTail && <BeatGridResizeHandle onPointerDown={(e) => handlePointerDown(index, e)} />}
      </>
    )
  }

  const editGrid = (
    <div className="flex flex-col gap-2">
      <BeatGrid
        beats={displayBeats}
        beatsPerBar={beatsPerBar}
        barsPerRow={columns}
        gridResolution={gridResolution}
        renderSegment={renderEditSegment}
      />

      {/* Add chord button */}
      <button
        onClick={handleAddChord}
        className={cn(
          'flex items-center justify-center',
          'rounded-lg border-2 border-dashed',
          'border-slate-300 hover:border-indigo-300 dark:border-white/10 dark:hover:border-white/25',
          'text-slate-400 dark:text-slate-500',
          'hover:text-indigo-400',
          'transition-colors min-h-[40px]',
          'px-3 py-1'
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
