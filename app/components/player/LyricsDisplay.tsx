import { useMemo } from 'react'
import { cn } from '~/lib/utils'
import { parseChordPro, stripChords, type AnyParsedLine, type LyricParsedLine } from '~/lib/chordpro'
import { InstrumentalSectionInline } from './InstrumentalSection'

interface LyricsDisplayProps {
  lyrics: string
  className?: string
}

export function LyricsDisplay({ lyrics, className }: LyricsDisplayProps) {
  const parsed = useMemo(() => {
    return parseChordPro(lyrics)
  }, [lyrics])

  return (
    <div className={cn('space-y-4', className)}>
      {parsed.lines.map((line, index) => {
        // A lyric line that immediately follows a chords-only line is rendered
        // inside that chords-only block — skip it here.
        if (line.type === 'lyric' && index > 0 && parsed.lines[index - 1].type === 'chords-only') {
          return null
        }

        const pairedLyric =
          line.type === 'chords-only' &&
          index + 1 < parsed.lines.length &&
          parsed.lines[index + 1].type === 'lyric'
            ? (parsed.lines[index + 1] as LyricParsedLine)
            : undefined

        return (
          <LyricsLine key={index} line={line} elementId={`element-${index}`} pairedLyric={pairedLyric} />
        )
      })}
    </div>
  )
}

function LyricsLine({
  line,
  elementId,
  pairedLyric,
}: {
  line: AnyParsedLine
  elementId: string
  pairedLyric?: LyricParsedLine
}) {
  if (line.type === 'empty') {
    return <div className="h-4" data-element-id={elementId} />
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
      <div data-element-id={elementId}>
        <InstrumentalSectionInline section={line.section} />
      </div>
    )
  }

  if (line.type === 'chords-only') {
    // When this chords-only line annotates a lyric, display that lyric text
    // (chords are hidden in lyrics-only mode).
    if (pairedLyric) {
      const cleanText = stripChords(pairedLyric.raw)
      if (!cleanText.trim()) {
        return <div className="h-4" data-element-id={elementId} />
      }
      return (
        <p className="text-slate-900 dark:text-white leading-relaxed" data-element-id={elementId}>
          {cleanText}
        </p>
      )
    }
    // No paired lyric — pure instrumental passage
    return (
      <div className="py-2 text-slate-400 dark:text-slate-500 italic text-sm" data-element-id={elementId}>
        ♪ instrumental ({line.chordBars.length} {line.chordBars.length === 1 ? 'compás' : 'compases'})
      </div>
    )
  }

  // Regular lyric line - strip chords for display
  const cleanText = stripChords(line.raw)
  if (!cleanText.trim()) {
    return <div className="h-4" data-element-id={elementId} />
  }

  return (
    <p className="text-slate-900 dark:text-white leading-relaxed" data-element-id={elementId}>
      {cleanText}
    </p>
  )
}
