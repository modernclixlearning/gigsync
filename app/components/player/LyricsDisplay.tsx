import { useMemo } from 'react'
import { cn } from '~/lib/utils'
import { parseChordPro, stripChords, type AnyParsedLine } from '~/lib/chordpro'
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
      {parsed.lines.map((line, index) => (
        <LyricsLine key={index} line={line} elementId={`element-${index}`} />
      ))}
    </div>
  )
}

function LyricsLine({ line, elementId }: { line: AnyParsedLine; elementId: string }) {
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
    // In lyrics-only mode, show instrumental indicator
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
