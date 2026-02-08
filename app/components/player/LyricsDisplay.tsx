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
        <LyricsLine key={index} line={line} />
      ))}
    </div>
  )
}

function LyricsLine({ line }: { line: AnyParsedLine }) {
  if (line.type === 'empty') {
    return <div className="h-4" />
  }

  if (line.type === 'section') {
    return (
      <div className="pt-6 pb-2">
        <h3 className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">
          {line.name}
        </h3>
      </div>
    )
  }

  if (line.type === 'instrumental') {
    return <InstrumentalSectionInline section={line.section} />
  }

  if (line.type === 'chords-only') {
    // In lyrics-only mode, show instrumental indicator
    return (
      <div className="py-2 text-slate-400 dark:text-slate-500 italic text-sm">
        ♪ instrumental ({line.chordBars.length} {line.chordBars.length === 1 ? 'compás' : 'compases'})
      </div>
    )
  }

  // Regular lyric line - strip chords for display
  const cleanText = stripChords(line.raw)
  if (!cleanText.trim()) {
    return <div className="h-4" />
  }

  return (
    <p className="text-slate-900 dark:text-white leading-relaxed">
      {cleanText}
    </p>
  )
}
