import { useMemo } from 'react'
import { cn } from '~/lib/utils'
import { parseChordPro, type AnyParsedLine } from '~/lib/chordpro'
import { InstrumentalSection } from './InstrumentalSection'
import { LyricBarGrid } from './LyricBarGrid'
import type { LyricParsedLine } from '~/lib/chordpro'

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
}

export function ChordOverlay({ lyrics, transpose = 0, columns = 4, className, onChordClick, isSeekEnabled = false }: ChordOverlayProps) {
  const parsed = useMemo(() => {
    return parseChordPro(lyrics, transpose)
  }, [lyrics, transpose])

  return (
    <div className={cn('space-y-1 font-mono', className)}>
      {parsed.lines.map((line, index) => (
        <ChordOverlayLine
          key={index}
          line={line}
          transpose={transpose}
          columns={columns}
          elementId={`element-${index}`}
          onChordClick={onChordClick}
          isSeekEnabled={isSeekEnabled}
        />
      ))}
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
}: {
  line: AnyParsedLine
  transpose: number
  columns: number
  elementId: string
  onChordClick?: (elementId: string, chordIndex: number | null) => void
  isSeekEnabled?: boolean
}) {
  if (line.type === 'empty') {
    return <div className="h-6" data-element-id={elementId} />
  }

  if (line.type === 'section') {
    return (
      <div className="pt-6 pb-2" data-element-id={elementId}>
        <h3 className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">
          {line.name}
        </h3>
      </div>
    )
  }

  if (line.type === 'instrumental') {
    return (
      // data-bar-element tells the global highlight CSS to skip border-left
      <div className="py-3" data-element-id={elementId} data-bar-element>
        <InstrumentalSection
          section={line.section}
          transpose={transpose}
          columns={columns}
          elementId={elementId}
          onChordClick={onChordClick}
          isSeekEnabled={isSeekEnabled}
        />
      </div>
    )
  }

  if (line.type === 'chords-only') {
    // Chord-only lines shown as inline chord badges
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

  if (line.type === 'directive') {
    return null
  }

  // ── Lyric line ──────────────────────────────────────────────────────────────
  const lyricLine = line as LyricParsedLine

  if (lyricLine.chords.length > 0) {
    // Sung line WITH chords → bar grid (chord badge + lyric text per bar)
    return (
      <LyricBarGrid
        line={lyricLine}
        transpose={transpose}
        columns={columns}
        elementId={elementId}
        className="my-1"
        onChordClick={onChordClick}
        isSeekEnabled={isSeekEnabled}
      />
    )
  }

  // Sung line without any chord annotation → plain text
  return (
    <div className="relative" data-element-id={elementId}>
      <p className="text-slate-900 dark:text-white whitespace-pre leading-relaxed">
        {lyricLine.text}
      </p>
    </div>
  )
}
