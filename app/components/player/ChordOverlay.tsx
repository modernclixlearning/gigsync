import { useCallback, useMemo, useState } from 'react'
import { cn } from '~/lib/utils'
import { parseChordPro, type AnyParsedLine, type SectionType } from '~/lib/chordpro'
import { getSectionType } from '~/lib/chordpro'
import { serializeParsedSong } from '~/lib/chordpro/serializer'
import { InstrumentalSection } from './InstrumentalSection'
import { LyricBarGrid } from './LyricBarGrid'
import { ChordPicker } from './ChordPicker'
import { InlineTextEditor } from './InlineTextEditor'
import { SectionPicker } from './SectionPicker'
import { useBubbleMenu } from './useBubbleMenu'
import { BubbleMenu } from './BubbleMenu'
import type { BubbleMenuAction } from './BubbleMenu'
import type {
  ChordsOnlyLine,
  InstrumentalLine,
  LyricParsedLine,
  ChordBar,
  SectionLine,
  EmptyLine,
  ChordPosition,
} from '~/lib/chordpro'

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
  /** Minimum beat resolution for extend/subdivide operations. Default 0.25. */
  gridResolution?: number
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
  gridResolution = 0.25,
}: ChordOverlayProps) {
  const parsed = useMemo(() => parseChordPro(lyrics, transpose), [lyrics, transpose])

  // Local editable copy of parsed lines — updated on every drag-and-drop
  const [lines, setLines] = useState<AnyParsedLine[]>(() => parsed.lines)
  const [showSectionPicker, setShowSectionPicker] = useState<number | null>(null)

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

  // ── Structural editing: insert / delete lines ───────────────────────────────
  const persistLines = useCallback(
    (newLines: AnyParsedLine[]) => {
      setLines(newLines)
      onLyricsChange?.(serializeParsedSong(newLines))
    },
    [onLyricsChange]
  )

  const handleInsertLine = useCallback(
    (afterIndex: number, newLine: AnyParsedLine) => {
      const next = [...lines]
      next.splice(afterIndex + 1, 0, newLine)
      persistLines(next)
    },
    [lines, persistLines]
  )

  const handleDeleteLine = useCallback(
    (index: number) => {
      if (lines.length <= 1) return
      const next = lines.filter((_, i) => i !== index)
      persistLines(next)
    },
    [lines, persistLines]
  )

  const handleAddSection = useCallback(
    (afterIndex: number, type: SectionType, name: string) => {
      const sectionLine: SectionLine = {
        type: 'section',
        name,
        sectionType: type,
        raw: `[${name}]`,
      }
      // Insert section header + an empty lyric line after it
      const emptyLyric: LyricParsedLine = {
        type: 'lyric',
        text: '',
        chords: [{ chord: 'C', position: 0, beats: 4 }],
        raw: '[C]',
      }
      const next = [...lines]
      next.splice(afterIndex + 1, 0, sectionLine, emptyLyric)
      persistLines(next)
      setShowSectionPicker(null)
    },
    [lines, persistLines]
  )

  const handleAddLyricLine = useCallback(
    (afterIndex: number) => {
      const newLine: LyricParsedLine = {
        type: 'lyric',
        text: '',
        chords: [{ chord: 'C', position: 0, beats: 4 }],
        raw: '[C]',
      }
      handleInsertLine(afterIndex, newLine)
    },
    [handleInsertLine]
  )

  // Keep local lines in sync when isEditable turns on
  const stableLines = useMemo(() => {
    if (!isEditable) return syncedLines
    return lines
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditable])

  return (
    <div className={cn('space-y-3', className)}>
      {/* Top insert controls — add before the first line (when editable) */}
      {isEditable && (
        <div className="flex items-center justify-center gap-2 py-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={() => handleAddLyricLine(-1)}
            className={cn(
              'text-xs px-2 py-1 rounded-full',
              'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
              'hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400',
              'transition-colors'
            )}
          >
            + Linea
          </button>
          <div className="relative">
            <button
              onClick={() => setShowSectionPicker(showSectionPicker === -1 ? null : -1)}
              className={cn(
                'text-xs px-2 py-1 rounded-full',
                'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                'hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400',
                'transition-colors'
              )}
            >
              + Sección
            </button>
            {showSectionPicker === -1 && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50">
                <SectionPicker
                  onSelect={(type, name) => handleAddSection(-1, type, name)}
                  onClose={() => setShowSectionPicker(null)}
                />
              </div>
            )}
          </div>
        </div>
      )}

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
          <div key={index}>
            <ChordOverlayLine
              line={line}
              transpose={transpose}
              columns={columns}
              elementId={elementId}
              onChordClick={onChordClick}
              isSeekEnabled={isSeekEnabled}
              isEditable={isEditable}
              onLineChange={(updated) => handleLineChange(index, updated)}
              onDeleteLine={() => handleDeleteLine(index)}
              gridResolution={gridResolution}
              lineCount={displayLines.length}
            />

            {/* Between-line insert controls (when editable) */}
            {isEditable && (
              <div className="flex items-center justify-center gap-2 py-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  onClick={() => handleAddLyricLine(index)}
                  className={cn(
                    'text-xs px-2 py-1 rounded-full',
                    'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                    'hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400',
                    'transition-colors'
                  )}
                >
                  + Linea
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowSectionPicker(showSectionPicker === index ? null : index)}
                    className={cn(
                      'text-xs px-2 py-1 rounded-full',
                      'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                      'hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400',
                      'transition-colors'
                    )}
                  >
                    + Sección
                  </button>
                  {showSectionPicker === index && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50">
                      <SectionPicker
                        onSelect={(type, name) => handleAddSection(index, type, name)}
                        onClose={() => setShowSectionPicker(null)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Edit hints — shown when editable and not playing */}
      {isEditable && (
        <div className="text-center pt-4 pb-2 select-none space-y-1">
          <p className="text-xs text-slate-400 dark:text-slate-600">
            Mantené presionado o click derecho para editar/eliminar
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-600">
            Deslizá entre líneas para insertar • Mantené presionado el acorde para mover
          </p>
        </div>
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
  onDeleteLine,
  gridResolution = 0.25,
  lineCount = 1,
}: {
  line: AnyParsedLine
  transpose: number
  columns: number
  elementId: string
  onChordClick?: (elementId: string, chordIndex: number | null) => void
  isSeekEnabled?: boolean
  isEditable?: boolean
  onLineChange: (updated: AnyParsedLine) => void
  onDeleteLine?: () => void
  gridResolution?: number
  lineCount?: number
}) {
  // ── Line-level bubble menu (for deleting lines) ──────────────────────────────
  const canDeleteLine = isEditable && lineCount > 1 && line.type !== 'directive'
  const lineBubbleMenu = useBubbleMenu({ isEnabled: canDeleteLine })

  const lineMenuActions = useMemo((): BubbleMenuAction[] => [
    {
      id: 'delete-line',
      label: 'Eliminar línea',
      icon: '✕',
      variant: 'danger' as const,
      onAction: () => {
        onDeleteLine?.()
        lineBubbleMenu.close()
      },
    },
  ], [onDeleteLine, lineBubbleMenu.close])

  const lineHandlers = canDeleteLine
    ? lineBubbleMenu.getHandlers(-1)
    : {}

  // Render the line-level bubble menu (shared across all line types)
  const lineBubbleMenuPortal = lineBubbleMenu.state.visible && lineBubbleMenu.state.anchorRect && (
    <BubbleMenu
      anchorRect={lineBubbleMenu.state.anchorRect}
      actions={lineMenuActions}
      onClose={lineBubbleMenu.close}
    />
  )

  if (line.type === 'empty') {
    return (
      <div className="relative group h-8" data-element-id={elementId} {...lineHandlers}>
        {lineBubbleMenuPortal}
      </div>
    )
  }

  if (line.type === 'section') {
    return (
      <div className="relative group pt-8 pb-3" data-element-id={elementId} {...lineHandlers}>
        <h3 className="text-xs font-medium text-white/40 dark:text-white/40 text-slate-400 uppercase tracking-widest">
          {isEditable ? (
            <InlineTextEditor
              value={line.name}
              isEditable
              onCommit={(newName) => {
                onLineChange({
                  ...line,
                  name: newName,
                  sectionType: getSectionType(newName),
                  raw: `[${newName}]`,
                } as SectionLine)
              }}
              className="text-indigo-500 dark:text-indigo-400 font-semibold uppercase"
              placeholder="Nombre de sección..."
            />
          ) : (
            line.name
          )}
        </h3>
        {lineBubbleMenuPortal}
      </div>
    )
  }

  if (line.type === 'instrumental') {
    return (
      <div className="relative group py-3" data-element-id={elementId} data-bar-element {...lineHandlers}>
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
          gridResolution={gridResolution}
        />
        {lineBubbleMenuPortal}
      </div>
    )
  }

  if (line.type === 'chords-only') {
    return (
      <div className="relative group" {...lineHandlers}>
        <EditableChordsOnlyBadges
          line={line}
          elementId={elementId}
          isEditable={isEditable}
          onChordsChange={(newBars) =>
            onLineChange({ ...line, chordBars: newBars } as ChordsOnlyLine)
          }
        />
        {lineBubbleMenuPortal}
      </div>
    )
  }

  if (line.type === 'directive') {
    return null
  }

  // ── Lyric line ──────────────────────────────────────────────────────────────
  const lyricLine = line as LyricParsedLine

  if (lyricLine.chords.length > 0) {
    return (
      <div className="relative group" {...lineHandlers}>
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
          onTextChange={(newText, newChords) =>
            onLineChange({ ...lyricLine, text: newText, chords: newChords } as LyricParsedLine)
          }
          gridResolution={gridResolution}
        />
        {lineBubbleMenuPortal}
      </div>
    )
  }

  // Lyric line with no chords — show editable text + option to add first chord
  return (
    <div className="relative group" data-element-id={elementId} {...lineHandlers}>
      {isEditable ? (
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <InlineTextEditor
              value={lyricLine.text}
              isEditable
              onCommit={(newText) =>
                onLineChange({ ...lyricLine, text: newText } as LyricParsedLine)
              }
              className="text-slate-900 dark:text-white whitespace-pre leading-relaxed"
              placeholder="Letra..."
            />
          </div>
          <button
            onClick={() => {
              const newChords: ChordPosition[] = [{ chord: 'C', position: 0, beats: 4 }]
              onLineChange({ ...lyricLine, chords: newChords } as LyricParsedLine)
            }}
            className={cn(
              'shrink-0 text-xs px-2 py-1 rounded',
              'bg-indigo-50 dark:bg-indigo-900/30',
              'text-indigo-500 dark:text-indigo-400',
              'hover:bg-indigo-100 dark:hover:bg-indigo-900/50',
              'transition-colors mt-0.5'
            )}
            aria-label="Agregar acorde"
          >
            + Acorde
          </button>
        </div>
      ) : (
        <p className="text-slate-900 dark:text-white whitespace-pre leading-relaxed">
          {lyricLine.text}
        </p>
      )}
      {lineBubbleMenuPortal}
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
  const [editingIndex, setEditingIndex] = useLocalState<number | null>(null)

  // ── Bubble menu for chord badges ──────────────────────────────────────────
  const bubbleMenu = useBubbleMenu({ isEnabled: isEditable })

  const handleChordNameChange = (index: number, newChord: string) => {
    const newBars = line.chordBars.map((b, i) =>
      i === index ? { ...b, chord: newChord } : b
    )
    onChordsChange(newBars)
  }

  const handleAddChord = () => {
    const lastChord = line.chordBars[line.chordBars.length - 1]?.chord ?? 'C'
    onChordsChange([...line.chordBars, { chord: lastChord }])
  }

  const handleDeleteChord = (index: number) => {
    if (line.chordBars.length <= 1) return
    onChordsChange(line.chordBars.filter((_, i) => i !== index))
    setEditingIndex(null)
  }

  const bubbleMenuActions = useMemo((): BubbleMenuAction[] => {
    const idx = bubbleMenu.state.targetIndex
    return [
      {
        id: 'edit',
        label: 'Editar',
        icon: '✎',
        variant: 'default' as const,
        onAction: () => {
          setEditingIndex(idx)
          bubbleMenu.close()
        },
      },
      {
        id: 'delete',
        label: 'Eliminar',
        icon: '✕',
        variant: 'danger' as const,
        disabled: line.chordBars.length <= 1,
        onAction: () => {
          handleDeleteChord(idx)
          bubbleMenu.close()
        },
      },
    ]
  }, [bubbleMenu.state.targetIndex, line.chordBars.length])

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
          <div className="flex flex-wrap gap-3 font-bold items-center">
            {line.chordBars.map((bar, i) => {
              const badgeHandlers = bubbleMenu.getHandlers(i)
              return (
                <div key={ids[i]} className="relative flex items-center gap-0.5" {...badgeHandlers}>
                  <SortableChordBadge id={ids[i]} chord={bar.chord} />
                  {editingIndex === i && (
                    <div className="absolute top-full left-0 mt-1 z-50">
                      <ChordPicker
                        currentChord={bar.chord}
                        onSelect={(chord) => handleChordNameChange(i, chord)}
                        onClose={() => setEditingIndex(null)}
                      />
                    </div>
                  )}
                </div>
              )
            })}
            {/* Add chord button */}
            <button
              onClick={handleAddChord}
              className={cn(
                'px-2 py-1 rounded border-2 border-dashed',
                'border-slate-300 dark:border-slate-600',
                'text-slate-400 dark:text-slate-500',
                'hover:border-indigo-400 hover:text-indigo-500',
                'transition-colors text-sm'
              )}
              aria-label="Agregar acorde"
            >
              +
            </button>
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
