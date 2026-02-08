/**
 * InstrumentalSection Component
 * Visual grid display for instrumental passages with chord progressions
 */

import { cn } from '~/lib/utils'
import type { ChordBar, InstrumentalSection as InstrumentalSectionType } from '~/lib/chordpro'
import { transposeChord } from '~/lib/chordpro'

interface InstrumentalSectionProps {
  /** Section data */
  section: InstrumentalSectionType
  /** Number of columns in the grid (typically 4 for 4/4 time) */
  columns?: number
  /** Transpose semitones */
  transpose?: number
  /** Additional class names */
  className?: string
  /** Compact mode for smaller displays */
  compact?: boolean
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
  bg: string
  border: string
  text: string
  headerBg: string
} {
  switch (type) {
    case 'intro':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-emerald-200 dark:border-emerald-800',
        text: 'text-emerald-700 dark:text-emerald-300',
        headerBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      }
    case 'solo':
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-700 dark:text-amber-300',
        headerBg: 'bg-amber-100 dark:bg-amber-900/40',
      }
    case 'outro':
      return {
        bg: 'bg-rose-50 dark:bg-rose-900/20',
        border: 'border-rose-200 dark:border-rose-800',
        text: 'text-rose-700 dark:text-rose-300',
        headerBg: 'bg-rose-100 dark:bg-rose-900/40',
      }
    case 'interlude':
    case 'break':
      return {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800',
        text: 'text-purple-700 dark:text-purple-300',
        headerBg: 'bg-purple-100 dark:bg-purple-900/40',
      }
    default:
      return {
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        border: 'border-indigo-200 dark:border-indigo-800',
        text: 'text-indigo-700 dark:text-indigo-300',
        headerBg: 'bg-indigo-100 dark:bg-indigo-900/40',
      }
  }
}

export function InstrumentalSection({
  section,
  columns = 4,
  transpose = 0,
  className,
  compact = false
}: InstrumentalSectionProps) {
  const colors = getSectionColors(section.type)
  const icon = getSectionIcon(section.type)
  
  // Apply transposition to chords
  const chords = section.chordBars.map(bar => ({
    ...bar,
    chord: transpose !== 0 ? transposeChord(bar.chord, transpose) : bar.chord
  }))
  
  // Group chords into rows
  const rows: ChordBar[][] = []
  for (let i = 0; i < chords.length; i += columns) {
    rows.push(chords.slice(i, i + columns))
  }
  
  // If no chords but we have a bar count, show placeholder
  const showPlaceholder = chords.length === 0 && section.bars > 0
  
  return (
    <div 
      className={cn(
        'rounded-xl border overflow-hidden',
        colors.bg,
        colors.border,
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-2',
        colors.headerBg,
        'border-b',
        colors.border
      )}>
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
      
      {/* Chord Grid */}
      {rows.length > 0 ? (
        <div className={cn('p-2', compact ? 'p-1' : 'p-3')}>
          <div 
            className="grid gap-1"
            style={{ 
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` 
            }}
          >
            {chords.map((bar, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center justify-center',
                  'rounded-lg border',
                  'bg-white dark:bg-slate-800',
                  'border-slate-200 dark:border-slate-700',
                  compact ? 'py-2 px-1' : 'py-3 px-2',
                  'transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50'
                )}
              >
                <span className={cn(
                  'font-mono font-bold',
                  'text-slate-900 dark:text-white',
                  compact ? 'text-sm' : 'text-base'
                )}>
                  {bar.chord}
                </span>
              </div>
            ))}
            
            {/* Fill empty cells in last row */}
            {rows.length > 0 && rows[rows.length - 1].length < columns && (
              Array(columns - rows[rows.length - 1].length).fill(0).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className={cn(
                    'flex items-center justify-center',
                    'rounded-lg border border-dashed',
                    'border-slate-200 dark:border-slate-700',
                    compact ? 'py-2 px-1' : 'py-3 px-2',
                    'opacity-30'
                  )}
                />
              ))
            )}
          </div>
        </div>
      ) : showPlaceholder ? (
        <div className={cn('p-4 text-center', colors.text, 'opacity-60')}>
          <span className={compact ? 'text-xs' : 'text-sm'}>
            {section.bars} {section.bars === 1 ? 'compás' : 'compases'} de {section.name.toLowerCase()}
          </span>
        </div>
      ) : null}
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
  
  // Apply transposition
  const chords = section.chordBars.map(bar => 
    transpose !== 0 ? transposeChord(bar.chord, transpose) : bar.chord
  )
  
  return (
    <div className={cn('py-4', className)}>
      <div className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
        colors.bg,
        'border',
        colors.border
      )}>
        <span>{icon}</span>
        <span className={cn('text-sm font-semibold uppercase', colors.text)}>
          {section.name}
        </span>
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
