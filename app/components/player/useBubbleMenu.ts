/**
 * useBubbleMenu Hook
 *
 * Encapsulates trigger logic for a contextual bubble menu:
 *  - Long-press (configurable, default 600ms) — opt-in via `enableLongPress`
 *  - Right-click (context menu)
 *  - Keyboard: Enter/Space when focused, Delete/Backspace for direct delete
 *
 * Returns handler props to spread onto the target element and state for
 * positioning the BubbleMenu portal.
 */

import { useCallback, useRef, useState } from 'react'

export interface BubbleMenuState {
  /** Whether the menu is currently visible */
  visible: boolean
  /** Bounding rect of the anchor element (for portal positioning) */
  anchorRect: DOMRect | null
  /** Index of the targeted chord/cell (-1 for line-level targets) */
  targetIndex: number
}

const INITIAL_STATE: BubbleMenuState = {
  visible: false,
  anchorRect: null,
  targetIndex: -1,
}

export interface UseBubbleMenuOptions {
  /** Master switch — when false, all handlers are no-ops */
  isEnabled: boolean
  /** Long-press delay in ms. Default 600. */
  longPressDelay?: number
  /** Max pointer movement (px) before cancelling long-press. Default 8. */
  longPressTolerance?: number
}

export function useBubbleMenu({
  isEnabled,
  longPressDelay = 600,
  longPressTolerance = 8,
}: UseBubbleMenuOptions) {
  const [state, setState] = useState<BubbleMenuState>(INITIAL_STATE)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)

  const open = useCallback(
    (index: number, anchor: HTMLElement) => {
      setState({
        visible: true,
        anchorRect: anchor.getBoundingClientRect(),
        targetIndex: index,
      })
    },
    []
  )

  const close = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    startPosRef.current = null
  }, [])

  /**
   * Returns event handler props to spread onto a target element.
   *
   * @param index - chord/cell index (or -1 for line-level targets)
   * @param options.enableLongPress - set true only when long-press is NOT
   *   already claimed by dnd-kit drag on this same element.
   */
  const getHandlers = useCallback(
    (
      index: number,
      options?: { enableLongPress?: boolean }
    ) => {
      if (!isEnabled) return {}

      const enableLP = options?.enableLongPress ?? false

      const onContextMenu = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const target = e.currentTarget as HTMLElement
        open(index, target)
      }

      const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          const target = e.currentTarget as HTMLElement
          open(index, target)
        }
      }

      const result: Record<string, unknown> = {
        onContextMenu,
        onKeyDown,
      }

      if (enableLP) {
        result.onPointerDown = (e: React.PointerEvent) => {
          // Only primary button (left click / touch)
          if (e.button !== 0) return
          // Don't trigger if target is inside a sortable handle
          const target = e.target as HTMLElement
          if (target.closest('[data-sortable-handle]')) return

          startPosRef.current = { x: e.clientX, y: e.clientY }
          const anchor = e.currentTarget as HTMLElement

          timerRef.current = setTimeout(() => {
            timerRef.current = null
            startPosRef.current = null
            open(index, anchor)
          }, longPressDelay)
        }

        result.onPointerMove = (e: React.PointerEvent) => {
          if (!startPosRef.current || !timerRef.current) return
          const dx = e.clientX - startPosRef.current.x
          const dy = e.clientY - startPosRef.current.y
          if (Math.abs(dx) > longPressTolerance || Math.abs(dy) > longPressTolerance) {
            clearTimer()
          }
        }

        result.onPointerUp = () => {
          clearTimer()
        }

        result.onPointerCancel = () => {
          clearTimer()
        }
      }

      return result
    },
    [isEnabled, longPressDelay, longPressTolerance, open, clearTimer]
  )

  return { state, open, close, getHandlers }
}
