/**
 * LyricBarGrid Component
 *
 * Renders a sung lyric line as a bar-based grid, similar in structure to
 * InstrumentalSection. Each cell = one bar:
 *   - Chord badge at the top
 *   - Lyric text for that bar below
 *
 * `data-chord-index` on every cell enables per-bar playhead highlighting
 * via the same CSS mechanism used for instrumental sections.
 *
 * The user controls how many syllables/words fall in each bar by using
 * spaces or tabs to align the ChordPro text in their editor; trimming
 * normalises it for the grid display.
 */

import { cn } from '~/lib/utils'
import type { LyricParsedLine } from '~/lib/chordpro'
import { transposeChord } from '~/lib/chordpro'

interface LyricBarGridProps {
  line: LyricParsedLine
  /** Number of columns in the grid (2 = zoomed-in, 4 = normal) */
  columns?: number
  transpose?: number
  elementId: string
  className?: string
  /** Called when a chord cell is tapped; only wired when seek is available. */
  onChordClick?: (elementId: string, chordIndex: number | null) => void
  /** When true, chord cells show pointer cursor and hover feedback. */
  isSeekEnabled?: boolean
}

interface BarSegment {
  chord: string
  text: string
}

/**
 * Split a lyric line into bar segments.
 * Each chord marks the start of a new bar; the segment text runs up to
 * (but not including) the next chord position.
 */
function splitIntoBarSegments(line: LyricParsedLine, transpose: number): BarSegment[] {
  const { text, chords } = line
  return chords.map((chordPos, i) => {
    const startPos = chordPos.position
    const endPos = i + 1 < chords.length ? chords[i + 1].position : text.length
    const segText = text.slice(startPos, endPos).trim()
    const chord = transpose !== 0 ? transposeChord(chordPos.chord, transpose) : chordPos.chord
    return { chord, text: segText }
  })
}

export function LyricBarGrid({
  line,
  columns = 4,
  transpose = 0,
  elementId,
  className,
  onChordClick,
  isSeekEnabled = false,
}: LyricBarGridProps) {
  const segments = splitIntoBarSegments(line, transpose)

  if (segments.length === 0) return null

  // Limit columns to the actual number of segments so the grid never has
  // more columns than content (e.g. a 1-chord line stays as 1 column).
  const effectiveCols = Math.min(columns, segments.length)

  const remainder = segments.length % effectiveCols
  const emptyCells = remainder === 0 ? 0 : effectiveCols - remainder

  return (
    <div
      data-element-id={elementId}
      data-bar-element
      className={cn(
        'rounded-xl border overflow-hidden',
        'bg-slate-50 dark:bg-slate-900/40',
        'border-slate-200 dark:border-slate-700',
        className
      )}
    >
      <div className="p-2">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))` }}
        >
          {segments.map((seg, index) => (
            <div
              key={index}
              data-chord-index={index}
              {...(isSeekEnabled && { role: 'button', tabIndex: 0 })}
              onClick={isSeekEnabled ? () => onChordClick?.(elementId, index) : undefined}
              className={cn(
                'flex flex-col gap-1',
                'rounded-lg border',
                'bg-white dark:bg-slate-800',
                'border-slate-200 dark:border-slate-700',
                'px-2 py-2',
                'transition-colors duration-150',
                isSeekEnabled && 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
              )}
            >
              {/* Chord badge */}
              <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 leading-none">
                {seg.chord}
              </span>
              {/* Lyric text */}
              <span className="text-slate-900 dark:text-white leading-snug whitespace-pre-wrap break-words">
                {seg.text || '\u00a0' /* non-breaking space keeps cell height */}
              </span>
            </div>
          ))}

          {/* Pad the last row so the grid stays aligned */}
          {Array.from({ length: emptyCells }, (_, i) => (
            <div
              key={`pad-${i}`}
              className={cn(
                'rounded-lg border border-dashed',
                'border-slate-200 dark:border-slate-700',
                'py-2 px-1',
                'opacity-25'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
