import { useMemo } from 'react'
import { cn } from '~/lib/utils'
import { parseChordPro, type AnyParsedLine, type LyricParsedLine, type ChordsOnlyLine } from '~/lib/chordpro'
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
      {parsed.lines.map((line, index) => {
        // A lyric line that immediately follows a chords-only line is rendered
        // inside that chords-only block — skip it here.
        if (line.type === 'lyric' && index > 0 && parsed.lines[index - 1].type === 'chords-only') {
          return null
        }

        // For a chords-only line, check whether the next line is a lyric to pair with it.
        const pairedLyric =
          line.type === 'chords-only' &&
          index + 1 < parsed.lines.length &&
          parsed.lines[index + 1].type === 'lyric'
            ? (parsed.lines[index + 1] as LyricParsedLine)
            : undefined

        return (
          <ChordOverlayLine
            key={index}
            line={line}
            transpose={transpose}
            elementId={`element-${index}`}
            pairedLyric={pairedLyric}
          />
        )
      })}
    </div>
  )
}

function ChordOverlayLine({
  line,
  transpose,
  elementId,
  pairedLyric,
}: {
  line: AnyParsedLine
  transpose: number
  elementId: string
  pairedLyric?: LyricParsedLine
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
      <div className="py-3" data-element-id={elementId}>
        <InstrumentalSection 
          section={line.section} 
          transpose={transpose}
          columns={4}
        />
      </div>
    )
  }

  if (line.type === 'chords-only') {
    const chordsLine = line as ChordsOnlyLine
    return (
      <div className="py-2" data-element-id={elementId}>
        {/* Chord bars row */}
        <div className="flex flex-wrap gap-3 font-bold text-indigo-500 dark:text-indigo-400">
          {chordsLine.chordBars.map((bar, i) => (
            <span key={i} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded">
              {bar.chord}
            </span>
          ))}
          {chordsLine.repeatCount && chordsLine.repeatCount > 1 && (
            <span className="text-slate-400 text-sm self-center">×{chordsLine.repeatCount}</span>
          )}
        </div>
        {/* Paired lyric line rendered directly below its chord row */}
        {pairedLyric && (
          pairedLyric.chords.length > 0 ? (
            <div className="relative mt-1">
              <div className="relative font-bold text-indigo-500 dark:text-indigo-400" style={{ height: '1.2em', fontSize: '0.85em' }}>
                {pairedLyric.chords.map((chord, i) => (
                  <span
                    key={i}
                    className="absolute whitespace-nowrap"
                    style={{ left: `${chord.position * 0.6}em` }}
                  >
                    {chord.chord}
                  </span>
                ))}
              </div>
              <p className="text-slate-900 dark:text-white whitespace-pre leading-relaxed">
                {pairedLyric.text}
              </p>
            </div>
          ) : (
            <p className="text-slate-900 dark:text-white whitespace-pre leading-relaxed mt-1">
              {pairedLyric.text}
            </p>
          )
        )}
      </div>
    )
  }

  if (line.type === 'directive') {
    return null
  }

  // Lyric line with chord overlay
  return (
    <div className="relative" data-element-id={elementId}>
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

