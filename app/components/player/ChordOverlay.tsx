import { useMemo } from 'react'
import { cn } from '~/lib/utils'
import { parseChordPro, type AnyParsedLine } from '~/lib/chordpro'
import { InstrumentalSection } from './InstrumentalSection'

interface ChordOverlayProps {
  lyrics: string
  transpose?: number
  className?: string
}

export function ChordOverlay({ lyrics, transpose = 0, className }: ChordOverlayProps) {
  const parsed = useMemo(() => {
    return parseChordPro(lyrics, transpose)
  }, [lyrics, transpose])

  return (
    <div className={cn('space-y-1 font-mono', className)}>
      {parsed.lines.map((line, index) => (
        <ChordOverlayLine key={index} line={line} transpose={transpose} />
      ))}
    </div>
  )
}

function ChordOverlayLine({ line, transpose }: { line: AnyParsedLine; transpose: number }) {
  if (line.type === 'empty') {
    return <div className="h-6" />
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
    return (
      <div className="py-3">
        <InstrumentalSection 
          section={line.section} 
          transpose={transpose}
          columns={4}
        />
      </div>
    )
  }

  if (line.type === 'chords-only') {
    // Render chord-only line (no lyrics, just chords in sequence)
    return (
      <div className="py-2">
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

  // Lyric line with chord overlay
  return (
    <div className="relative">
      {/* Chord line */}
      {line.chords && line.chords.length > 0 && (
        <div className="relative font-bold text-indigo-500 dark:text-indigo-400" style={{ height: '1.2em', fontSize: '0.85em' }}>
          {line.chords.map((chord, i) => (
            <span
              key={i}
              className="absolute whitespace-nowrap"
              style={{ left: `${chord.position * 0.6}em` }}
            >
              {chord.chord}
            </span>
          ))}
        </div>
      )}
      {/* Lyric line */}
      <p className="text-slate-900 dark:text-white whitespace-pre leading-relaxed">
        {line.text}
      </p>
    </div>
  )
}

