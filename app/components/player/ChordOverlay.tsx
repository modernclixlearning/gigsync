import { useMemo } from 'react'
import { cn } from '~/lib/utils'

interface ChordOverlayProps {
  lyrics: string
  transpose?: number
  className?: string
}

// Chord transposition map
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord

  // Match the root note (with optional sharp/flat)
  const match = chord.match(/^([A-G][#b]?)(.*)$/)
  if (!match) return chord

  const [, root, suffix] = match
  const isFlat = root.includes('b')
  const noteArray = isFlat ? FLAT_NOTES : NOTES
  
  // Normalize the root
  let normalizedRoot = root
  if (root === 'Db') normalizedRoot = 'C#'
  if (root === 'Eb') normalizedRoot = 'D#'
  if (root === 'Gb') normalizedRoot = 'F#'
  if (root === 'Ab') normalizedRoot = 'G#'
  if (root === 'Bb') normalizedRoot = 'A#'

  const currentIndex = NOTES.indexOf(normalizedRoot)
  if (currentIndex === -1) return chord

  const newIndex = (currentIndex + semitones + 12) % 12
  const newRoot = noteArray[newIndex]

  return newRoot + suffix
}

interface ParsedLine {
  type: 'section' | 'lyric' | 'empty'
  content: string
  chords?: { chord: string; position: number }[]
}

function parseChordProLine(line: string, transpose: number): ParsedLine {
  const trimmed = line.trim()
  
  if (trimmed === '') {
    return { type: 'empty', content: '' }
  }

  // Section headers
  if (/^\[.+\]$/.test(trimmed)) {
    return { type: 'section', content: trimmed.replace(/[\[\]]/g, '') }
  }

  // Parse chords in brackets like [Am] or [G7]
  const chordRegex = /\[([A-G][#b]?[^[\]]*)\]/g
  const chords: { chord: string; position: number }[] = []
  let cleanText = ''
  let lastIndex = 0
  let match

  while ((match = chordRegex.exec(line)) !== null) {
    cleanText += line.slice(lastIndex, match.index)
    chords.push({
      chord: transposeChord(match[1], transpose),
      position: cleanText.length
    })
    lastIndex = match.index + match[0].length
  }
  cleanText += line.slice(lastIndex)

  return {
    type: 'lyric',
    content: cleanText || ' ', // Non-breaking space for chord-only lines
    chords
  }
}

export function ChordOverlay({ lyrics, transpose = 0, className }: ChordOverlayProps) {
  const parsedLines = useMemo(() => {
    return lyrics.split('\n').map((line) => parseChordProLine(line, transpose))
  }, [lyrics, transpose])

  return (
    <div className={cn('space-y-1 font-mono', className)}>
      {parsedLines.map((line, index) => {
        if (line.type === 'empty') {
          return <div key={index} className="h-6" />
        }

        if (line.type === 'section') {
          return (
            <div key={index} className="pt-6 pb-2">
              <h3 className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">
                {line.content}
              </h3>
            </div>
          )
        }

        // Render lyric line with chord overlay
        return (
          <div key={index} className="relative">
            {/* Chord line */}
            {line.chords && line.chords.length > 0 && (
              <div className="relative h-5 text-sm font-bold text-indigo-500 dark:text-indigo-400">
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
              {line.content}
            </p>
          </div>
        )
      })}
    </div>
  )
}
