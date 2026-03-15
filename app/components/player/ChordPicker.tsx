/**
 * ChordPicker Component
 *
 * A tablet-friendly chord selector with root note + quality grids.
 * Appears as a popover near the tapped chord cell.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '~/lib/utils'

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const ROOTS_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

const QUALITIES = [
  { label: 'maj', suffix: '' },
  { label: 'min', suffix: 'm' },
  { label: '7', suffix: '7' },
  { label: 'maj7', suffix: 'maj7' },
  { label: 'm7', suffix: 'm7' },
  { label: 'sus2', suffix: 'sus2' },
  { label: 'sus4', suffix: 'sus4' },
  { label: 'dim', suffix: 'dim' },
  { label: 'aug', suffix: 'aug' },
  { label: 'add9', suffix: 'add9' },
  { label: '9', suffix: '9' },
  { label: '6', suffix: '6' },
] as const

interface ChordPickerProps {
  currentChord: string
  onSelect: (chord: string) => void
  onClose: () => void
}

/** Parse current chord into root + suffix for initial selection */
function parseCurrentChord(chord: string): { root: string; suffix: string } {
  const match = chord.match(/^([A-G][#b]?)(.*)$/)
  if (!match) return { root: 'C', suffix: '' }
  return { root: match[1], suffix: match[2] }
}

export function ChordPicker({ currentChord, onSelect, onClose }: ChordPickerProps) {
  const parsed = parseCurrentChord(currentChord)
  const [root, setRoot] = useState(parsed.root)
  const [suffix, setSuffix] = useState(parsed.suffix)
  const [useFlats, setUseFlats] = useState(parsed.root.includes('b'))
  const containerRef = useRef<HTMLDivElement>(null)

  const roots = useFlats ? ROOTS_FLAT : ROOTS

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to avoid the same click that opened this
    const timer = setTimeout(() => document.addEventListener('pointerdown', handleClick), 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', handleClick)
    }
  }, [onClose])

  const handleRootSelect = useCallback(
    (r: string) => {
      setRoot(r)
      onSelect(r + suffix)
    },
    [suffix, onSelect]
  )

  const handleSuffixSelect = useCallback(
    (s: string) => {
      setSuffix(s)
      onSelect(root + s)
    },
    [root, onSelect]
  )

  const currentChordPreview = root + suffix

  return (
    <div
      ref={containerRef}
      className={cn(
        'bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700',
        'p-3 w-[280px] select-none z-50'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Preview */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
          {currentChordPreview || 'C'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseFlats(!useFlats)}
            className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
          >
            {useFlats ? '♭→♯' : '♯→♭'}
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Root notes grid (3×4) */}
      <div className="grid grid-cols-6 gap-1 mb-3">
        {roots.map((r) => (
          <button
            key={r}
            onClick={() => handleRootSelect(r)}
            className={cn(
              'py-2 rounded-lg text-sm font-bold font-mono transition-colors',
              'min-h-[40px]',
              r === root
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
            )}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="border-t border-slate-200 dark:border-slate-700 my-2" />

      {/* Qualities grid (3×4) */}
      <div className="grid grid-cols-4 gap-1">
        {QUALITIES.map((q) => (
          <button
            key={q.suffix}
            onClick={() => handleSuffixSelect(q.suffix)}
            className={cn(
              'py-2 rounded-lg text-xs font-semibold transition-colors',
              'min-h-[36px]',
              q.suffix === suffix
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-900/30'
            )}
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  )
}
