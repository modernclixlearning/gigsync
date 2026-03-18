/**
 * BubbleMenu Component
 *
 * A floating contextual menu rendered via portal.
 * Shows edit/delete actions for chord cells and line containers.
 * Positions itself above (or below) the anchor element.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '~/lib/utils'

export interface BubbleMenuAction {
  id: string
  label: string
  icon: string
  variant: 'default' | 'danger'
  onAction: () => void
  disabled?: boolean
}

interface BubbleMenuProps {
  /** Bounding rect of the anchor element */
  anchorRect: DOMRect
  /** Actions to display */
  actions: BubbleMenuAction[]
  /** Close callback */
  onClose: () => void
}

export function BubbleMenu({ anchorRect, actions, onClose }: BubbleMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  // Calculate position after first render (need menu dimensions)
  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return

    const menuRect = menu.getBoundingClientRect()
    const gap = 8

    // Prefer above; fall back to below if not enough space
    let top: number
    if (anchorRect.top - menuRect.height - gap > 0) {
      top = anchorRect.top - menuRect.height - gap + window.scrollY
    } else {
      top = anchorRect.bottom + gap + window.scrollY
    }

    // Center horizontally, clamped to viewport
    let left = anchorRect.left + anchorRect.width / 2 - menuRect.width / 2 + window.scrollX
    left = Math.max(8, Math.min(left, window.innerWidth - menuRect.width - 8))

    setPosition({ top, left })
  }, [anchorRect])

  // Close on outside click (after a brief delay to prevent the triggering click from closing)
  useEffect(() => {
    const timer = setTimeout(() => {
      const handler = (e: PointerEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          onClose()
        }
      }
      document.addEventListener('pointerdown', handler, { capture: true })
      return () => document.removeEventListener('pointerdown', handler, { capture: true })
    }, 50)

    return () => clearTimeout(timer)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handler, { capture: true })
    return () => document.removeEventListener('keydown', handler, { capture: true })
  }, [onClose])

  // Close on scroll
  useEffect(() => {
    const handler = () => onClose()
    window.addEventListener('scroll', handler, { capture: true, passive: true })
    return () => window.removeEventListener('scroll', handler, { capture: true })
  }, [onClose])

  const enabledActions = actions.filter(a => !a.disabled)
  if (enabledActions.length === 0) return null

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      className={cn(
        'fixed z-[9999] flex items-stretch',
        'bg-white dark:bg-slate-800',
        'rounded-xl shadow-2xl',
        'border border-slate-200 dark:border-slate-700',
        'overflow-hidden',
        'transition-all duration-100',
        position ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
      )}
      style={
        position
          ? { top: position.top, left: position.left, position: 'absolute' }
          : { top: anchorRect.top - 40 + window.scrollY, left: anchorRect.left + window.scrollX, position: 'absolute', pointerEvents: 'none' }
      }
    >
      {enabledActions.map((action, i) => (
        <button
          key={action.id}
          role="menuitem"
          onClick={(e) => {
            e.stopPropagation()
            action.onAction()
          }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-sm font-medium',
            'transition-colors whitespace-nowrap',
            i > 0 && 'border-l border-slate-200 dark:border-slate-700',
            action.variant === 'danger'
              ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30'
              : 'text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400',
          )}
        >
          <span className="text-base leading-none">{action.icon}</span>
          {action.label}
        </button>
      ))}
    </div>
  )

  return createPortal(menu, document.body)
}
