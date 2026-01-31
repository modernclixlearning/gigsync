import { cn } from '~/lib/utils'

interface LyricsDisplayProps {
  lyrics: string
  className?: string
}

export function LyricsDisplay({ lyrics, className }: LyricsDisplayProps) {
  const lines = lyrics.split('\n')

  return (
    <div className={cn('space-y-4', className)}>
      {lines.map((line, index) => {
        // Check if line is a section header (e.g., [Verse], [Chorus])
        const isSectionHeader = /^\[.+\]$/.test(line.trim())
        
        // Check if line is empty
        const isEmpty = line.trim() === ''

        if (isEmpty) {
          return <div key={index} className="h-4" />
        }

        if (isSectionHeader) {
          const sectionName = line.replace(/[\[\]]/g, '')
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
            {line}
          </p>
        )
      })}
    </div>
  )
}
