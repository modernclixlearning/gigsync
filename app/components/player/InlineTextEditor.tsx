/**
 * InlineTextEditor Component
 *
 * Tap-to-edit text input that shows as normal text when not editing.
 * Tablet-friendly with large touch targets.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '~/lib/utils'

interface InlineTextEditorProps {
  value: string
  onCommit: (newValue: string) => void
  className?: string
  placeholder?: string
  /** When false, renders as plain text (no editing). */
  isEditable?: boolean
}

export function InlineTextEditor({
  value,
  onCommit,
  className,
  placeholder = 'Letra...',
  isEditable = false,
}: InlineTextEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  /** Set when an edit is abandoned, so the blur that follows doesn't commit it. */
  const cancelledRef = useRef(false)

  // Sync draft when value changes externally
  useEffect(() => {
    if (!isEditing) setDraft(value)
  }, [value, isEditing])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleCommit = useCallback(() => {
    setIsEditing(false)
    if (cancelledRef.current) {
      cancelledRef.current = false
      return
    }
    if (draft !== value) {
      onCommit(draft)
    }
  }, [draft, value, onCommit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleCommit()
      }
      if (e.key === 'Escape') {
        setDraft(value)
        setIsEditing(false)
      }
    },
    [handleCommit, value]
  )

  if (!isEditable) {
    return (
      <span className={cn('leading-snug whitespace-pre-wrap break-words', className)}>
        {value || '\u00a0'}
      </span>
    )
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
        // A double-click is a gesture on the surrounding cell (subdivide), not
        // an edit: its first click opened this input with the pre-split text,
        // and committing that on blur would duplicate the lyric. Abandon the
        // edit and let the event bubble to the cell.
        onDoubleClick={() => {
          cancelledRef.current = true
          setDraft(value)
          setIsEditing(false)
        }}
        className={cn(
          'w-full bg-white dark:bg-slate-900 border border-indigo-400 dark:border-indigo-600',
          'rounded px-1 py-0.5 text-slate-900 dark:text-white',
          'outline-none ring-2 ring-indigo-300 dark:ring-indigo-700',
          'leading-snug',
          className
        )}
        placeholder={placeholder}
      />
    )
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        // Shift/Ctrl/Cmd+click extends the editor's cell selection instead.
        if (e.shiftKey || e.metaKey || e.ctrlKey) return
        cancelledRef.current = false
        setIsEditing(true)
      }}
      className={cn(
        'leading-snug whitespace-pre-wrap break-words cursor-text',
        'hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded px-0.5 -mx-0.5',
        'transition-colors',
        !value && 'text-slate-400 dark:text-slate-600 italic',
        className
      )}
    >
      {value || placeholder}
    </span>
  )
}
