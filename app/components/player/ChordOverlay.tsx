import { useCallback, useMemo, useState } from 'react'
import { cn } from '~/lib/utils'
import { parseChordPro, type AnyParsedLine } from '~/lib/chordpro'
import { serializeParsedSong } from '~/lib/chordpro/serializer'
import { InstrumentalSection } from './InstrumentalSection'
import { LyricBarGrid } from './LyricBarGrid'
import type { ChordsOnlyLine, InstrumentalLine, LyricParsedLine, ChordBar } from '~/lib/chordpro'

interface ChordOverlayProps {
  lyrics: string
  transpose?: number
  /** Number of grid columns (2 = zoomed-in, 4 = normal). Default 4. */
  columns?: number
  className?: string
  /** Called when a chord cell is tapped. Only fires when seek is available. */
  onChordClick?: (elementId: string, chordIndex: number | null) => void
  /** When true, chord cells show pointer cursor and hover feedback. */
  isSeekEnabled?: boolean
  /** When true, chords are draggable (long-press to pick up). */
  isEditable?: boolean
  /** Called with new serialized ChordPro text after each drag-and-drop edit. */
  onLyricsChange?: (newLyrics: string) => void
  /**
   * Maps parsed line indices to timeline element IDs (from createSongTimeline).
   * When provided, element IDs are taken from this map instead of being derived locally,
   * eliminating divergence between calculator merge logic and rendered IDs.
   */
  lineIndexToElementId?: Map<number, string>
}

export function ChordOverlay({
  lyrics,
  transpose = 0,
  columns = 4,
  className,
  onChordClick,
  isSeekEnabled = false,
  isEditable = false,
  onLyricsChange,
  lineIndexToElementId,
}: ChordOverlayProps) {
  const parsed = useMemo(() => parseChordPro(lyrics, transpose), [lyrics, transpose])

  // Local editable copy of parsed lines — updated on every drag-and-drop
  const [lines, setLines] = useState<AnyParsedLine[]>(() => parsed.lines)

  // Re-sync when lyrics prop changes (e.g. after save)
  const prevLyrics = useMemo(() => lyrics, [lyrics])
  const syncedLines = useMemo(() => {
    // When the source lyrics change (after save), reset local state
    return parsed.lines
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevLyrics, transpose])

  // Use synced lines when not editable, local state when editable
  const displayLines = isEditable ? lines : syncedLines

  const handleLineChange = useCallback(
    (idx: number, updated: AnyParsedLine) => {
      setLines((prev) => {
        const next = prev.map((l, i) => (i === idx ? updated : l))
        const serialized = serializeParsedSong(next)
        onLyricsChange?.(serialized)
        return next
      })
    },
    [onLyricsChange]
  )

  // Keep local lines in sync when isEditable turns on
  const stableLines = useMemo(() => {
    if (!isEditable) return syncedLines
    return lines
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditable])

  return (
    <div className={cn('space-y-1 font-mono', className)}>
      {displayLines.map((line, index) => {
        // Prefer the authoritative map from createSongTimeline (single source of truth).
        // Fall back to the local derivation when the timeline is not yet ready (e.g. first
        // render before autoscroll initialises), so chord cells are never id-less.
        const elementId =
          lineIndexToElementId?.get(index) ?? (
            line.type === 'lyric' &&
            index > 0 &&
            displayLines[index - 1].type === 'chords-only'
              ? `element-${index - 1}`
              : `element-${index}`
          )

        return (
          <ChordOverlayLine
            key={index}
            line={line}
            transpose={transpose}
            columns={columns}
            elementId={elementId}
            onChordClick={onChordClick}
            isSeekEnabled={isSeekEnabled}
            isEditable={isEditable}
            onLineChange={(updated) => handleLineChange(index, updated)}
          />
        )
      })}

      {/* Edit hint — shown when editable and not playing */}
      {isEditable && (
        <p className="text-center text-xs text-slate-400 dark:text-slate-600 pt-4 pb-2 select-none">
          Mantené presionado un acorde para moverlo
        </p>
      )}
    </div>
  )
}

function ChordOverlayLine({
  line,
  transpose,
  columns,
  elementId,
  onChordClick,
  isSeekEnabled = false,
  isEditable = false,
  onLineChange,
}: {
  line: AnyParsedLine
  transpose: number
  columns: number
  elementId: string
  onChordClick?: (elementId: string, chordIndex: number | null) => void
  isSeekEnabled?: boolean
  isEditable?: boolean
  onLineChange: (updated: AnyParsedLine) => void
}) {
  if (line.type === 'empty') {
    return <div className="h-6" data-element-id={elementId} />
  }

  if (line.type === 'section') {
    return (
      <div className="pt-6 pb-2" data-element-id={elementId}>
        <h3 className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">
          {line.name}
        </h3>
      </div>
    )
  }

  if (line.type === 'instrumental') {
    return (
      <div className="py-3" data-element-id={elementId} data-bar-element>
        <InstrumentalSection
          section={line.section}
          transpose={transpose}
          columns={columns}
          elementId={elementId}
          onChordClick={onChordClick}
          isSeekEnabled={isSeekEnabled}
          isEditable={isEditable}
          onChordsChange={(newBars) =>
            onLineChange({
              ...line,
              section: { ...line.section, chordBars: newBars },
            } as InstrumentalLine)
          }
        />
      </div>
    )
  }

  if (line.type === 'chords-only') {
    return (
      <EditableChordsOnlyBadges
        line={line}
        elementId={elementId}
        isEditable={isEditable}
        onChordsChange={(newBars) =>
          onLineChange({ ...line, chordBars: newBars } as ChordsOnlyLine)
        }
      />
    )
  }

  if (line.type === 'directive') {
    return null
  }

  // ── Lyric line ──────────────────────────────────────────────────────────────
  const lyricLine = line as LyricParsedLine

  if (lyricLine.chords.length > 0) {
    return (
      <LyricBarGrid
        line={lyricLine}
        transpose={transpose}
        columns={columns}
        elementId={elementId}
        className="my-1"
        onChordClick={onChordClick}
        isSeekEnabled={isSeekEnabled}
        isEditable={isEditable}
        onChordsReorder={(newChords) =>
          onLineChange({ ...lyricLine, chords: newChords } as LyricParsedLine)
        }
      />
    )
  }

  return (
    <div className="relative" data-element-id={elementId}>
      <p className="text-slate-900 dark:text-white whitespace-pre leading-relaxed">
        {lyricLine.text}
      </p>
    </div>
  )
}

// ── Sortable chords-only inline badges ────────────────────────────────────────

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
import { useState as useLocalState } from 'react'

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
        'px-2 py-1 rounded font-bold text-indigo-500 dark:text-indigo-400',
        'bg-indigo-50 dark:bg-indigo-900/30',
        'touch-none select-none',
        'cursor-grab active:cursor-grabbing',
        isDragging ? 'opacity-40' : 'hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-700'
      )}
    >
      {chord}
    </span>
  )
}

function EditableChordsOnlyBadges({
  line,
  elementId,
  isEditable,
  onChordsChange,
}: {
  line: ChordsOnlyLine
  elementId: string
  isEditable: boolean
  onChordsChange: (bars: ChordBar[]) => void
}) {
  const [activeId, setActiveId] = useLocalState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 500, tolerance: 8 } })
  )

  const ids = line.chordBars.map((_, i) => `co-${elementId}-${i}`)
  const activeChord = activeId
    ? line.chordBars[ids.indexOf(activeId)]?.chord
    : null

  if (!isEditable) {
    return (
      <div className="py-2" data-element-id={elementId}>
        <div className="flex flex-wrap gap-3 font-bold text-indigo-500 dark:text-indigo-400">
          {line.chordBars.map((bar, i) => (
            <span key={i} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded">
              {bar.chord}
            </span>
          ))}
          {line.repeatCount && line.repeatCount > 1 && (
            <span className="text-slate-400 text-sm self-center">×{line.repeatCount}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="py-2" data-element-id={elementId}>
      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
        onDragEnd={(e: DragEndEvent) => {
          setActiveId(null)
          const { active, over } = e
          if (!over || active.id === over.id) return
          const oldIdx = ids.indexOf(active.id as string)
          const newIdx = ids.indexOf(over.id as string)
          if (oldIdx === -1 || newIdx === -1) return
          onChordsChange(arrayMove(line.chordBars, oldIdx, newIdx))
        }}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap gap-3 font-bold">
            {line.chordBars.map((bar, i) => (
              <SortableChordBadge key={ids[i]} id={ids[i]} chord={bar.chord} />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeChord && (
            <span className="px-2 py-1 rounded font-bold bg-indigo-600 text-white shadow-lg">
              {activeChord}
            </span>
          )}
        </DragOverlay>
      </DndContext>
      {line.repeatCount && line.repeatCount > 1 && (
        <span className="text-slate-400 text-sm ml-1">×{line.repeatCount}</span>
      )}
    </div>
  )
}
