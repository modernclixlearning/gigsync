/**
 * useChordResize – Edge-drag hook for chord cell duration editing.
 *
 * Provides a resize handle between adjacent chord cells.
 * Dragging left/right transfers beats between the cell and its right sibling,
 * snapping to `gridResolution` increments.
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
  /** Called with final beat array when drag ends */
  onResize: (beats: number[]) => void
}

export function useChordResize({ beats, gridResolution, onResize }: UseChordResizeOptions) {
  const [dragState, setDragState] = useState<ResizeDragState | null>(null)
  const startXRef = useRef(0)
  const containerWidthRef = useRef(0)
  const totalBeatsRef = useRef(0)
  const originalBeatsRef = useRef<number[]>([])

  const handlePointerDown = useCallback(
    (index: number, e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()

      const container = (e.currentTarget as HTMLElement).closest('[data-resize-container]')
      if (!container) return

      const rect = container.getBoundingClientRect()
      containerWidthRef.current = rect.width
      totalBeatsRef.current = beats.reduce((s, b) => s + b, 0)
      originalBeatsRef.current = [...beats]
      startXRef.current = e.clientX

      setDragState({ index, beats: [...beats] })

      const target = e.currentTarget
      target.setPointerCapture(e.pointerId)
    },
    [beats]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragState) return

      const deltaX = e.clientX - startXRef.current
      const pxPerBeat = containerWidthRef.current / totalBeatsRef.current
      const rawDeltaBeats = deltaX / pxPerBeat
      const snappedDelta = Math.round(rawDeltaBeats / gridResolution) * gridResolution

      const orig = originalBeatsRef.current
      const idx = dragState.index
      const newLeft = orig[idx] + snappedDelta
      const newRight = orig[idx + 1] - snappedDelta

      if (newLeft < gridResolution || newRight < gridResolution) return

      const newBeats = [...orig]
      newBeats[idx] = newLeft
      newBeats[idx + 1] = newRight
      setDragState({ index: idx, beats: newBeats })
    },
    [dragState, gridResolution]
  )

  const handlePointerUp = useCallback(
    (_e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragState) return
      const changed = dragState.beats.some(
        (b, i) => Math.abs(b - originalBeatsRef.current[i]) > 1e-9
      )
      if (changed) {
        onResize(dragState.beats)
      }
      setDragState(null)
    },
    [dragState, onResize]
  )

  return {
    dragState,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  }
}
