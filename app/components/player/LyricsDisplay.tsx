import { cn } from '~/lib/utils'

interface LyricsDisplayProps {
  lyrics: string
  className?: string
}

// Check if a string inside brackets is a valid chord (not a section header)
// Valid chords: [A], [Am], [A#m7], [Bb], [G7sus4], [C/E], etc.
// Section headers: [Chorus], [Verse], [Bridge] - these are NOT chords
function isValidChord(chordText: string): boolean {
  // Pattern: A-G note, optional #/b, then either:
  // - Nothing (standalone note)
  // - Valid chord suffix (m, maj, min, sus, dim, aug, add, numbers, slash chords)
  // Does NOT match words like "Chorus", "Verse" that have lowercase letters
  // that aren't part of valid chord suffixes
  return /^[A-G][#b]?(?:m(?:aj|in|7|9|11|13)?|sus[24]?|dim|aug|add[49]?|[0-9]+|\/[A-G][#b]?)?$/i.test(chordText)
}

// Strip ChordPro chord brackets from a line, e.g., "[Am]Hello [G]world" -> "Hello world"
function stripChords(line: string): string {
  // Match brackets and check if content is a valid chord
  return line.replace(/\[([^\]]+)\]/g, (match, content) => {
    return isValidChord(content) ? '' : match
  })
}

export function LyricsDisplay({ lyrics, className }: LyricsDisplayProps) {
  const lines = lyrics.split('\n')

  return (
    <div className={cn('space-y-4', className)}>
      {lines.map((line, index) => {
        const trimmedLine = line.trim()
        
        // Check if line is a section header (e.g., [Verse], [Chorus])
        // Section headers are lines that contain ONLY [text] where the text is NOT a valid chord
        const isSectionHeader = /^\[.+\]$/.test(trimmedLine) && 
          !isValidChord(trimmedLine.replace(/[\[\]]/g, ''))
        
        // Strip chords from the line (chords will be removed, section headers preserved)
        const cleanLine = stripChords(line)
        
        // Check if line is empty
        const isEmpty = cleanLine.trim() === ''

        if (isEmpty) {
          return <div key={index} className="h-4" />
        }

        if (isSectionHeader) {
          const sectionName = cleanLine.replace(/[\[\]]/g, '')
          return (
            <div key={index} className="pt-6 pb-2">
              <h3 className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">
                {sectionName}
              </h3>
            </div>
          )
        }

        return (
          <p
            key={index}
            className="text-slate-900 dark:text-white leading-relaxed"
          >
            {cleanLine}
          </p>
        )
      })}
    </div>
  )
}
