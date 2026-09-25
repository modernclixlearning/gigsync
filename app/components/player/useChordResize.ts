/**
 * useChordResize – Edge-drag hook for chord cell duration editing.
 *
 * Provides a resize handle between adjacent chord cells.
 * Dragging left/right transfers beats between the cell and its right sibling,
 * snapping to `gridResolution` increments. Dragging the last cell's edge
 * lengthens/shortens that cell alone.
 */

import { useCallback, useRef, useState } from 'react'

export interface ResizeDragState {
  /** Index of the cell whose right edge is being dragged */
  index: number
  /** Beat values during drag (live preview) */
  beats: number[]
}

interface UseChordResizeOptions {
  /** Current beat values per cell */
  beats: number[]
  /** Minimum beat resolution (snap step) */
  gridResolution: number
  /** Beats spanned by the full container width (fixed grid). Defaults to the sum of `beats`. */
  beatsPerRow?: number
  /** Called with final beat array when drag ends */
  onResize: (beats: number[]) => void
}

export function useChordResize({ beats, gridResolution, beatsPerRow, onResize }: UseChordResizeOptions) {
  const [dragState, setDragState] = useState<ResizeDragState | null>(null)
  const dragRef = useRef<ResizeDragState | null>(null)
  const onResizeRef = useRef(onResize)
  onResizeRef.current = onResize

  // Move/up are tracked on window, not on the handle: when a chord's edge
  // crosses into another grid row its handle remounts and loses pointer
  // capture, and the pointer may leave the grid while dragging.
  const handlePointerDown = useCallback(
    (index: number, e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()

      const container = (e.currentTarget as HTMLElement).closest('[data-resize-container]')
      if (!container) return

      const pxPerBeat =
        container.getBoundingClientRect().width /
        (beatsPerRow ?? beats.reduce((s, b) => s + b, 0))
      const orig = [...beats]
      const startX = e.clientX
      const isLast = index === orig.length - 1

      const update = (next: ResizeDragState | null) => {
        dragRef.current = next
        setDragState(next)
      }
      update({ index, beats: orig })

      const onMove = (ev: PointerEvent) => {
        const rawDeltaBeats = (ev.clientX - startX) / pxPerBeat
        const snappedDelta = Math.round(rawDeltaBeats / gridResolution) * gridResolution
        const newLeft = orig[index] + snappedDelta
        const newRight = isLast ? Infinity : orig[index + 1] - snappedDelta
        if (newLeft < gridResolution || newRight < gridResolution) return

        const newBeats = [...orig]
        newBeats[index] = newLeft
        if (!isLast) newBeats[index + 1] = newRight
        update({ index, beats: newBeats })
      }

      const onEnd = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onEnd)
        window.removeEventListener('pointercancel', onEnd)
        const final = dragRef.current
        update(null)
        if (ev.type === 'pointercancel' || !final) return
        if (final.beats.some((b, i) => Math.abs(b - orig[i]) > 1e-9)) {
          onResizeRef.current(final.beats)
        }
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onEnd)
      window.addEventListener('pointercancel', onEnd)
    },
    [beats, beatsPerRow, gridResolution]
  )

  return { dragState, handlePointerDown }
}
