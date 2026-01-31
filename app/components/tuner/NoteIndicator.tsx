import { cn } from '~/lib/utils'
import type { NoteName } from '~/types/tuner'

export interface NoteIndicatorProps {
  /** Currently detected note */
  activeNote: NoteName | null
  /** Target note to highlight (from tuning preset) */
  targetNote?: NoteName | null
  /** Whether the tuner is actively listening */
  isActive: boolean
  /** Optional className */
  className?: string
}

const ALL_NOTES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/**
 * Chromatic note indicator showing all notes in the scale
 * Highlights the currently detected note
 */
export function NoteIndicator({
  activeNote,
  targetNote,
  isActive,
  className,
}: NoteIndicatorProps) {
  return (
    <div 
      className={cn(
        'flex flex-wrap justify-center gap-2',
        className
      )}
    >
      {ALL_NOTES.map((note) => {
        const isSharp = note.includes('#')
        const isActiveNote = activeNote === note && isActive
        const isTargetNote = targetNote === note
        
        return (
          <div
            key={note}
            className={cn(
              'flex items-center justify-center',
              'rounded-lg font-semibold',
              'transition-all duration-150',
              isSharp 
                ? 'w-10 h-8 text-sm' 
                : 'w-12 h-10 text-base',
              // Active note styling
              isActiveNote
                ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110'
                : isTargetNote
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500'
                  : isSharp
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
            )}
          >
            {note}
          </div>
        )
      })}
    </div>
  )
}
