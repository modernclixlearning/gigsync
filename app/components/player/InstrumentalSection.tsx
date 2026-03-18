/**
 * InstrumentalSection Component
 * Visual grid display for instrumental passages with chord progressions.
 *
 * When `isEditable`:
 *  - Right-click or keyboard (Enter/Space) on a cell to open bubble menu (Edit / Delete).
 *  - Chord cells are sortable via long-press drag (dnd-kit).
 *  - Cell borders show resize handles: drag to extend/shrink beats.
 *  - Double-click a cell to subdivide it into two halves.
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
import type { ChordBar, InstrumentalSection as InstrumentalSectionType } from '~/lib/chordpro'
import { transposeChord } from '~/lib/chordpro'
import { useChordResize } from './useChordResize'
import { ChordPicker } from './ChordPicker'
import { useBubbleMenu } from './useBubbleMenu'
import { BubbleMenu } from './BubbleMenu'
import type { BubbleMenuAction } from './BubbleMenu'

interface InstrumentalSectionProps {
  section: InstrumentalSectionType
  columns?: number
  transpose?: number
  className?: string
  compact?: boolean
  elementId?: string
  onChordClick?: (elementId: string, chordIndex: number | null) => void
  isSeekEnabled?: boolean
  /** When true, chord cells are draggable (long-press). */
  isEditable?: boolean
  /** Called after drag with reordered chord bars. */
  onChordsChange?: (bars: ChordBar[]) => void
  /** Minimum beat resolution for extend/subdivide operations. Default 0.25. */
  gridResolution?: number
}

/** Get icon for section type */
function getSectionIcon(type: InstrumentalSectionType['type']): string {
  switch (type) {
    case 'intro': return '🎬'
    case 'outro': return '🔚'
    case 'solo': return '🎸'
    case 'instrumental': return '🎵'
    case 'interlude': return '🎹'
    case 'break': return '⏸️'
    default: return '🎶'
  }
}

/** Get color scheme for section type */
function getSectionColors(type: InstrumentalSectionType['type']): {
  bg: string; border: string; text: string; headerBg: string
} {
  switch (type) {
    case 'intro':
      return { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', headerBg: 'bg-emerald-100 dark:bg-emerald-900/40' }
    case 'solo':
      return { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', headerBg: 'bg-amber-100 dark:bg-amber-900/40' }
    case 'outro':
      return { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', headerBg: 'bg-rose-100 dark:bg-rose-900/40' }
    case 'interlude':
    case 'break':
      return { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', headerBg: 'bg-purple-100 dark:bg-purple-900/40' }
    default:
      return { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800', text: 'text-indigo-700 dark:text-indigo-300', headerBg: 'bg-indigo-100 dark:bg-indigo-900/40' }
  }
}

// ── Sortable chord cell ───────────────────────────────────────────────────────

function SortableChordCell({
  id,
  bar,
  compact,
  isActive,
}: {
  id: string
  bar: ChordBar
  compact: boolean
  isActive: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex flex-col items-center justify-center relative',
        'rounded-lg border',
        'bg-white dark:bg-slate-800',
        'border-slate-200 dark:border-slate-700',
        compact ? 'py-2 px-1' : 'py-3 px-2',
        'touch-none select-none cursor-grab active:cursor-grabbing',
        isDragging
          ? 'opacity-30'
          : isActive
          ? 'ring-2 ring-indigo-500 shadow-md'
          : 'hover:ring-2 hover:ring-amber-300 dark:hover:ring-amber-700 hover:shadow-sm'
      )}
    >
      <span className={cn('font-mono font-bold text-slate-900 dark:text-white', compact ? 'text-sm' : 'text-base')}>
        {bar.chord}
      </span>
      {bar.label && (
        <span className="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5 leading-none">
          {bar.label}
        </span>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

function rowGridTemplate(row: ChordBar[], beatsPerBar = 4): string {
  const hasPartial = row.some(b => b.beats !== undefined)
  if (!hasPartial) return `repeat(${row.length}, minmax(0, 1fr))`
  return row.map(b => `${b.beats ?? beatsPerBar}fr`).join(' ')
}

export function InstrumentalSection({
  section,
  columns = 4,
  transpose = 0,
  className,
  compact = false,
  elementId,
  onChordClick,
  isSeekEnabled = false,
  isEditable = false,
  onChordsChange,
  gridResolution = 0.25,
}: InstrumentalSectionProps) {
  const colors = getSectionColors(section.type)
  const icon = getSectionIcon(section.type)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingChordIndex, setEditingChordIndex] = useState<number | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  const beatsPerBar = 4

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
        disabled: section.chordBars.length <= 1,
        onAction: () => {
          handleDeleteChord(idx)
          bubbleMenu.close()
        },
      },
    ]
  }, [bubbleMenu.state.targetIndex, section.chordBars.length])

  // ── Chord name editing ──────────────────────────────────────────────────────
  const handleChordNameChange = useCallback(
    (index: number, newChord: string) => {
      // Reverse-transpose so we store the original key
      const stored = transpose !== 0 ? transposeChord(newChord, -transpose) : newChord
      const newBars = section.chordBars.map((b, i) =>
        i === index ? { ...b, chord: stored } : b
      )
      onChordsChange?.(newBars)
      setEditingChordIndex(null)
    },
    [section.chordBars, transpose, onChordsChange]
  )

  const handleAddChord = useCallback(() => {
    const newBar: ChordBar = { chord: 'C', beats: beatsPerBar }
    onChordsChange?.([...section.chordBars, newBar])
  }, [section.chordBars, beatsPerBar, onChordsChange])

  const handleDeleteChord = useCallback(
    (index: number) => {
      if (section.chordBars.length <= 1) return
      onChordsChange?.(section.chordBars.filter((_, i) => i !== index))
    },
    [section.chordBars, onChordsChange]
  )

  // ── Beat values for each chord ──────────────────────────────────────────────
  const chordBeats = section.chordBars.map(b => b.beats ?? beatsPerBar)

  // ── Resize (edge-drag) ──────────────────────────────────────────────────────
  const handleResizeComplete = useCallback(
    (newBeats: number[]) => {
      const newBars = section.chordBars.map((b, i) => ({ ...b, beats: newBeats[i] }))
      onChordsChange?.(newBars)
    },
    [section.chordBars, onChordsChange]
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
      const bars = section.chordBars
      const bar = bars[index]
      const barBeats = bar.beats ?? beatsPerBar
      const halfBeats = barBeats / 2
      if (halfBeats < gridResolution) return

      const newBar: ChordBar = { chord: bar.chord, beats: halfBeats }
      const newBars = [
        ...bars.slice(0, index),
        { ...bar, beats: halfBeats },
        newBar,
        ...bars.slice(index + 1),
      ]
      onChordsChange?.(newBars)
    },
    [isEditable, section.chordBars, beatsPerBar, gridResolution, onChordsChange]
  )

  // ── Cell click (seek in player mode) ────────────────────────────────────────
  const handleCellClick = (index: number) => {
    if (isSeekEnabled && !isEditable && elementId) {
      onChordClick?.(elementId, index)
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 500, tolerance: 8 } })
  )

  // Apply transposition to chords
  const baseChords = section.chordBars.map(bar => ({
    ...bar,
    chord: transpose !== 0 ? transposeChord(bar.chord, transpose) : bar.chord
  }))

  // Expand chords by repeatCount for display (base chords are stored un-expanded)
  const chords = useMemo(() => {
    if (!section.repeatCount || section.repeatCount <= 1) return baseChords
    const expanded: typeof baseChords = []
    for (let i = 0; i < section.repeatCount; i++) expanded.push(...baseChords)
    return expanded
  }, [baseChords, section.repeatCount])

  const sortableIds = chords.map((_, i) => `instr-${elementId ?? 'x'}-${i}`)
  const activeChord = activeId
    ? chords[sortableIds.indexOf(activeId)]?.chord
    : null

  // Group chords into rows
  const rows: ChordBar[][] = []
  for (let i = 0; i < chords.length; i += columns) {
    rows.push(chords.slice(i, i + columns))
  }

  const showPlaceholder = chords.length === 0 && section.bars > 0

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = sortableIds.indexOf(active.id as string)
    const newIdx = sortableIds.indexOf(over.id as string)
    if (oldIdx === -1 || newIdx === -1) return
    onChordsChange?.(arrayMove(section.chordBars, oldIdx, newIdx))
  }

  // ── Grid template: proportional widths based on beats ───────────────────────
  const displayBeats = dragState ? dragState.beats : chordBeats

  // ── Chord grid ───────────────────────────────────────────────────────────────

  const chordGrid = rows.length > 0 ? (
    <div className={cn(compact ? 'p-1' : 'p-3', 'flex flex-col gap-1')}>
      {rows.map((row, rowIndex) => {
        const rowStartIdx = rowIndex * columns
        const rowBeats = row.map((_, ci) => displayBeats[rowStartIdx + ci] ?? beatsPerBar)
        const rowTemplate = isEditable
          ? rowBeats.map(b => `${b}fr`).join(' ')
          : rowGridTemplate(row)

        return (
          <div
            key={rowIndex}
            data-resize-container
            className="grid gap-0"
            style={{ gridTemplateColumns: rowTemplate }}
            onPointerMove={dragState ? handlePointerMove : undefined}
            onPointerUp={dragState ? handlePointerUp : undefined}
          >
            {row.map((bar, colIndex) => {
              const index = rowStartIdx + colIndex
              const id = sortableIds[index]
              const isLast = colIndex === row.length - 1

              if (isEditable) {
                const cellBubbleHandlers = bubbleMenu.getHandlers(index)
                return (
                  <div
                    key={id}
                    className="relative flex"
                    {...cellBubbleHandlers}
                  >
                    <div
                      onDoubleClick={() => handleDoubleClick(index)}
                      className="flex-1 min-w-0 rounded-lg"
                    >
                      <SortableChordCell
                        id={id}
                        bar={bar}
                        compact={compact}
                        isActive={activeId === id}
                      />
                    </div>
                    {/* Chord picker popover */}
                    {editingChordIndex === index && (
                      <div ref={pickerRef} className="absolute top-full left-0 z-50 mt-1">
                        <ChordPicker
                          currentChord={bar.chord}
                          onSelect={(chord) => handleChordNameChange(index, chord)}
                          onClose={() => setEditingChordIndex(null)}
                        />
                      </div>
                    )}
                    {/* Resize handle between cells */}
                    {!isLast && (
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

              // Read-only cell
              return (
                <div
                  key={index}
                  data-chord-index={index}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCellClick(index)}
                  className={cn(
                    'flex flex-col items-center justify-center',
                    'rounded-md',
                    compact ? 'py-2 px-1' : 'py-2 px-2',
                    'transition-colors',
                    isSeekEnabled && !isEditable && 'cursor-pointer hover:bg-white/5',
                  )}
                >
                  <span className={cn('font-mono font-bold', colors.text, compact ? 'text-sm' : 'text-base')}>
                    {bar.chord}
                  </span>
                  {bar.label && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5 leading-none">
                      {bar.label}
                    </span>
                  )}
                </div>
              )
            })}

            {/* Pad last row (read-only only) */}
            {!isEditable && rowIndex === rows.length - 1 && row.length < columns && !row.some(b => b.beats !== undefined) && (
              Array(columns - row.length).fill(0).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className={cn(
                    'flex items-center justify-center rounded-md',
                    compact ? 'py-2 px-1' : 'py-2 px-2',
                    'opacity-0'
                  )}
                />
              ))
            )}
          </div>
        )
      })}
      {/* Add chord button */}
      {isEditable && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={handleAddChord}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-xs hover:border-indigo-400 hover:text-indigo-500 transition-colors"
          >
            <span className="text-base leading-none">+</span> Acorde
          </button>
        </div>
      )}
    </div>
  ) : showPlaceholder ? (
    <div className={cn('p-4 text-center', colors.text, 'opacity-60')}>
      <span className={compact ? 'text-xs' : 'text-sm'}>
        {section.bars} {section.bars === 1 ? 'compás' : 'compases'} de {section.name.toLowerCase()}
      </span>
    </div>
  ) : null

  return (
    <div
      className={cn(
        'overflow-hidden',
        isEditable
          ? cn('rounded-xl border', colors.bg, colors.border, 'ring-1 ring-amber-300/40 dark:ring-amber-700/30')
          : 'py-1',
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between',
        isEditable
          ? cn('px-4 py-2', colors.headerBg, 'border-b', colors.border)
          : 'px-1 py-1'
      )}>
        <div className="flex items-center gap-2">
          <span className={isEditable ? 'text-lg' : 'text-base'}>{icon}</span>
          <span className={cn(
            'font-semibold uppercase tracking-wide',
            isEditable ? cn(colors.text, compact ? 'text-xs' : 'text-sm') : cn('text-xs', colors.text, 'opacity-70')
          )}>
            {section.name}
          </span>
        </div>
        <div className={cn('text-xs font-medium', colors.text, 'opacity-75')}>
          {section.bars} {section.bars === 1 ? 'compás' : 'compases'}
          {section.repeatCount && section.repeatCount > 1 && (
            <span className="ml-2">×{section.repeatCount}</span>
          )}
        </div>
      </div>

      {/* Chord grid — wrapped in DndContext when editable */}
      {isEditable && chords.length > 0 ? (
        <DndContext
          sensors={sensors}
          onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
            {chordGrid}
          </SortableContext>
          <DragOverlay>
            {activeChord && (
              <div className={cn('flex items-center justify-center rounded-lg border bg-indigo-600 border-indigo-600 shadow-xl', compact ? 'py-2 px-2' : 'py-3 px-3')}>
                <span className={cn('font-mono font-bold text-white', compact ? 'text-sm' : 'text-base')}>
                  {activeChord}
                </span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        chordGrid
      )}

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

/** Minimal inline version for use within lyrics */
export function InstrumentalSectionInline({
  section,
  transpose = 0,
  className
}: Omit<InstrumentalSectionProps, 'columns' | 'compact'>) {
  const colors = getSectionColors(section.type)
  const icon = getSectionIcon(section.type)

  const chords = section.chordBars.map(bar =>
    transpose !== 0 ? transposeChord(bar.chord, transpose) : bar.chord
  )

  return (
    <div className={cn('py-4', className)}>
      <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full', colors.bg, 'border', colors.border)}>
        <span>{icon}</span>
        <span className={cn('text-sm font-semibold uppercase', colors.text)}>{section.name}</span>
        {section.bars > 0 && (
          <span className={cn('text-xs', colors.text, 'opacity-75')}>
            • {section.bars} {section.bars === 1 ? 'bar' : 'bars'}
          </span>
        )}
        {chords.length > 0 && (
          <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
            ({chords.slice(0, 4).join(' → ')}{chords.length > 4 ? '...' : ''})
          </span>
        )}
      </div>
    </div>
  )
}
