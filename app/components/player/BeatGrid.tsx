/**
 * BeatGrid Component
 *
 * Fixed time grid used by the chord editor: every row is `barsPerRow` bars of
 * `beatsPerBar` beats, with bar lines and beat ticks drawn behind the cells.
 * Because the row width never depends on the chords it holds, bar lines line
 * up across rows and across lines, and a chord's width is exactly its length.
 */

import type { ReactNode } from 'react'
import { MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { SortingStrategy } from '@dnd-kit/sortable'
import { cn } from '~/lib/utils'
import { layoutBeatGrid, type BeatGridSegment } from '~/lib/timeline/beatGrid'

interface BeatGridProps {
  /** Duration in beats of each chord, in order */
  beats: number[]
  beatsPerBar: number
  barsPerRow: number
  gridResolution: number
  renderSegment: (segment: BeatGridSegment) => ReactNode
  className?: string
}

export function BeatGrid({
  beats,
  beatsPerBar,
  barsPerRow,
  gridResolution,
  renderSegment,
  className,
}: BeatGridProps) {
  const layout = layoutBeatGrid(beats, { beatsPerBar, barsPerRow, gridResolution })
  const beatsPerRow = barsPerRow * beatsPerBar

  return (
    <div
      data-resize-container
      className={cn('flex flex-col gap-1', className)}
    >
      {Array.from({ length: layout.rows }, (_, row) => (
        <div
          key={row}
          data-beat-grid-row={row}
          className="relative grid min-h-[3rem]"
          style={{ gridTemplateColumns: `repeat(${layout.unitsPerRow}, minmax(0, 1fr))` }}
        >
          {/* Bar lines + beat ticks, one per beat boundary (both row edges included) */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {Array.from({ length: beatsPerRow + 1 }, (_, k) => {
              const isBar = k % beatsPerBar === 0
              return (
                <div
                  key={k}
                  className={cn(
                    'absolute w-px -translate-x-1/2',
                    isBar
                      ? 'top-0 bottom-0 bg-slate-400 dark:bg-white/30'
                      : 'top-1/4 bottom-1/4 bg-slate-300/70 dark:bg-white/10'
                  )}
                  style={{ left: `${(k / beatsPerRow) * 100}%` }}
                />
              )
            })}
          </div>

          {layout.segments
            .filter((s) => s.row === row)
            .map((s) => (
              <div
                key={`${s.index}-${s.row}`}
                className="group/cell relative flex min-w-0"
                style={{ gridColumn: `${s.start + 1} / span ${s.span}`, gridRow: 1 }}
              >
                {renderSegment(s)}
              </div>
            ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Sensors for moving whole cells: a mouse drags after 5px of movement, a
 * finger after a 200ms hold (so scrolling the song still works on touch).
 */
export function useCellDragSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )
}

/**
 * Cells never reflow while dragging: on a time grid, shifting neighbours of
 * different widths is confusing. The drop target is highlighted instead and
 * the move is applied on drop.
 */
export const noReflowStrategy: SortingStrategy = () => null

/**
 * "+" on a cell's right edge: inserts an empty bar right after that cell.
 */
export function InsertBarButton({ onClick, visible }: { onClick: () => void; visible: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label="Insertar compás después"
      title="Insertar compás después"
      className={cn(
        'absolute -bottom-2.5 right-0 z-20 flex h-6 w-6 translate-x-1/2 items-center justify-center',
        'rounded-full border-2 border-dashed bg-white dark:bg-slate-900',
        'border-slate-300 text-slate-400 hover:border-indigo-300 hover:text-indigo-400',
        'dark:border-white/20 dark:text-slate-500 dark:hover:border-white/40',
        'transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60',
        visible ? 'opacity-100' : 'opacity-0 group-hover/cell:opacity-100 focus-visible:opacity-100'
      )}
    >
      <span className="text-sm leading-none">+</span>
    </button>
  )
}

/**
 * Drag handle sitting exactly on a chord's right edge (a grid line).
 */
export function BeatGridResizeHandle({
  onPointerDown,
}: {
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      aria-label="Cambiar duración"
      className="group/handle absolute -right-1.5 top-0 bottom-0 z-10 flex w-3 cursor-col-resize touch-none items-center justify-center"
    >
      <div
        className={cn(
          'h-2/3 w-1 rounded-full transition-colors',
          'bg-slate-300 dark:bg-slate-600',
          // Named group: the line wrapper is also a `.group`, and a plain
          // group-hover would light up every handle when hovering the line.
          'group-hover/handle:bg-indigo-400 dark:group-hover/handle:bg-indigo-500',
          'group-active/handle:bg-indigo-500 dark:group-active/handle:bg-indigo-400'
        )}
      />
    </div>
  )
}
