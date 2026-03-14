/**
 * InstrumentalSection Component
 * Visual grid display for instrumental passages with chord progressions.
 * When `isEditable`, chord cells become sortable via long-press drag.
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
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '~/lib/utils'
import type { ChordBar, InstrumentalSection as InstrumentalSectionType } from '~/lib/chordpro'
import { transposeChord } from '~/lib/chordpro'

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
        'flex flex-col items-center justify-center',
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
  const [selectedChordIndex, setSelectedChordIndex] = useState<number | null>(null)

  const handleCellClick = (index: number) => {
    if (isEditable) {
      setSelectedChordIndex((prev) => (prev === index ? null : index))
      return
    }
    if (isSeekEnabled && elementId) {
      onChordClick?.(elementId, index)
    }
  }

  const beatsPerBar = 4

  const canExtend = selectedChordIndex !== null && (() => {
    const next = section.chordBars[selectedChordIndex + 1]
    if (!next) return true
    const nextBeats = next.beats ?? beatsPerBar
    return nextBeats - gridResolution >= gridResolution
  })()

  const canSubdivide = selectedChordIndex !== null && (() => {
    const bar = section.chordBars[selectedChordIndex]
    const barBeats = bar.beats ?? beatsPerBar
    return barBeats / 2 >= gridResolution
  })()

  const handleExtend = () => {
    if (selectedChordIndex === null) return
    const bars = section.chordBars
    const bar = bars[selectedChordIndex]
    const barBeats = bar.beats ?? beatsPerBar
    const next = bars[selectedChordIndex + 1]

    let newBars: ChordBar[]
    if (next) {
      const nextBeats = next.beats ?? beatsPerBar
      if (nextBeats - gridResolution < gridResolution) return
      newBars = bars.map((b, i) => {
        if (i === selectedChordIndex) return { ...b, beats: barBeats + gridResolution }
        if (i === selectedChordIndex + 1) return { ...b, beats: nextBeats - gridResolution }
        return b
      })
    } else {
      newBars = bars.map((b, i) =>
        i === selectedChordIndex ? { ...b, beats: barBeats + gridResolution } : b
      )
    }
    onChordsChange?.(newBars)
  }

  const handleSubdivide = () => {
    if (selectedChordIndex === null) return
    const bars = section.chordBars
    const bar = bars[selectedChordIndex]
    const barBeats = bar.beats ?? beatsPerBar
    const halfBeats = barBeats / 2

    const newBar: ChordBar = { chord: bar.chord, beats: halfBeats }
    const newBars = [
      ...bars.slice(0, selectedChordIndex),
      { ...bar, beats: halfBeats },
      newBar,
      ...bars.slice(selectedChordIndex + 1),
    ]
    onChordsChange?.(newBars)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 500, tolerance: 8 } })
  )

  // Apply transposition to chords
  const chords = section.chordBars.map(bar => ({
    ...bar,
    chord: transpose !== 0 ? transposeChord(bar.chord, transpose) : bar.chord
  }))

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

  // ── Chord grid ───────────────────────────────────────────────────────────────

  const chordGrid = rows.length > 0 ? (
    <div className={cn(compact ? 'p-1' : 'p-3', 'flex flex-col gap-1')}>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-1"
          style={{ gridTemplateColumns: isEditable ? `repeat(${row.length}, minmax(0, 1fr))` : rowGridTemplate(row) }}
        >
          {row.map((bar, colIndex) => {
            const index = rowIndex * columns + colIndex
            const id = sortableIds[index]

            if (isEditable) {
              const isSelected = selectedChordIndex === index
              return (
                <div
                  key={id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCellClick(index)}
                  className={cn(
                    'rounded-lg',
                    isSelected && 'ring-2 ring-indigo-500 dark:ring-indigo-400'
                  )}
                >
                  <SortableChordCell
                    id={id}
                    bar={bar}
                    compact={compact}
                    isActive={activeId === id}
                  />
                </div>
              )
            }

            // Read-only cell
            const isSelected = selectedChordIndex === index
            return (
              <div
                key={index}
                data-chord-index={index}
                role="button"
                tabIndex={0}
                onClick={() => handleCellClick(index)}
                className={cn(
                  'flex flex-col items-center justify-center',
                  'rounded-lg border',
                  'bg-white dark:bg-slate-800',
                  'border-slate-200 dark:border-slate-700',
                  compact ? 'py-2 px-1' : 'py-3 px-2',
                  'transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50',
                  isSeekEnabled && !isEditable && 'cursor-pointer hover:!bg-indigo-50 dark:hover:!bg-indigo-900/20',
                  isEditable && 'cursor-pointer',
                  isSelected && 'ring-2 ring-indigo-500 dark:ring-indigo-400 border-indigo-300 dark:border-indigo-600'
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
          })}

          {/* Pad last row (read-only only) */}
          {!isEditable && rowIndex === rows.length - 1 && row.length < columns && !row.some(b => b.beats !== undefined) && (
            Array(columns - row.length).fill(0).map((_, i) => (
              <div
                key={`empty-${i}`}
                className={cn(
                  'flex items-center justify-center rounded-lg border border-dashed',
                  'border-slate-200 dark:border-slate-700',
                  compact ? 'py-2 px-1' : 'py-3 px-2',
                  'opacity-30'
                )}
              />
            ))
          )}
        </div>
      ))}
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
      className={cn('rounded-xl border overflow-hidden', colors.bg, colors.border, isEditable && 'ring-1 ring-amber-300 dark:ring-amber-700/50', className)}
      tabIndex={isEditable ? 0 : undefined}
      onKeyDown={(e) => { if (e.key === 'Escape') setSelectedChordIndex(null) }}
      onClick={(e) => { if (isEditable && e.target === e.currentTarget) setSelectedChordIndex(null) }}
    >
      {/* Header */}
      <div className={cn('flex items-center justify-between px-4 py-2', colors.headerBg, 'border-b', colors.border)}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className={cn('font-semibold uppercase tracking-wide', colors.text, compact ? 'text-xs' : 'text-sm')}>
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

      {/* Extend / Subdivide toolbar — visible when a cell is selected in editor mode */}
      {isEditable && selectedChordIndex !== null && (
        <div className="flex gap-2 px-3 pt-2">
          <button
            onClick={handleExtend}
            disabled={!canExtend}
            title="Extender duración"
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium',
              'border transition-colors',
              canExtend
                ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
            )}
          >
            + Extender
          </button>
          <button
            onClick={handleSubdivide}
            disabled={!canSubdivide}
            title="Subdividir celda"
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium',
              'border transition-colors',
              canSubdivide
                ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
            )}
          >
            ÷ Subdividir
          </button>
        </div>
      )}

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
