import { cn } from '~/lib/utils'
import type { NoteName } from '~/types/tuner'

export interface ChromaticDialProps {
  /** Currently detected note */
  activeNote: NoteName | null
  /** Cents deviation from perfect pitch (-50 to +50) */
  cents: number | null
  /** Whether the tuner is actively listening */
  isActive: boolean
  /** Size of the dial */
  size?: 'sm' | 'md' | 'lg'
  /** Optional className */
  className?: string
}

const ALL_NOTES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/**
 * Circular chromatic dial showing all 12 notes
 * Highlights the currently detected note with visual feedback
 */
export function ChromaticDial({
  activeNote,
  cents,
  isActive,
  size = 'md',
  className,
}: ChromaticDialProps) {
  const isInTune = cents !== null && Math.abs(cents) <= 5
  
  // Size configurations
  const sizes = {
    sm: { diameter: 200, noteRadius: 75, fontSize: 'text-sm', noteSize: 28 },
    md: { diameter: 280, noteRadius: 105, fontSize: 'text-base', noteSize: 36 },
    lg: { diameter: 360, noteRadius: 140, fontSize: 'text-lg', noteSize: 44 },
  }
  
  const { diameter, noteRadius, fontSize, noteSize } = sizes[size]
  const center = diameter / 2

  return (
    <div 
      className={cn('relative', className)}
      style={{ width: diameter, height: diameter }}
    >
      {/* Background circle */}
      <svg
        width={diameter}
        height={diameter}
        className="absolute inset-0"
      >
        {/* Outer ring */}
        <circle
          cx={center}
          cy={center}
          r={noteRadius + noteSize / 2 + 10}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-slate-200 dark:text-slate-700"
        />
        
        {/* Inner decorative circle */}
        <circle
          cx={center}
          cy={center}
          r={noteRadius - noteSize / 2 - 15}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-slate-200 dark:text-slate-700"
          strokeDasharray="4 4"
        />
        
        {/* Center indicator */}
        <circle
          cx={center}
          cy={center}
          r={20}
          className={cn(
            'transition-colors duration-200',
            !isActive
              ? 'fill-slate-100 dark:fill-slate-800'
              : isInTune
                ? 'fill-emerald-500'
                : 'fill-slate-200 dark:fill-slate-700'
          )}
        />
        <circle
          cx={center}
          cy={center}
          r={8}
          className={cn(
            'transition-colors duration-200',
            !isActive
              ? 'fill-slate-200 dark:fill-slate-700'
              : isInTune
                ? 'fill-emerald-400'
                : 'fill-slate-300 dark:fill-slate-600'
          )}
        />
      </svg>

      {/* Note positions around the circle */}
      {ALL_NOTES.map((note, index) => {
        // Calculate position on circle (starting from top, going clockwise)
        const angle = (index * 30 - 90) * (Math.PI / 180)
        const x = center + noteRadius * Math.cos(angle)
        const y = center + noteRadius * Math.sin(angle)
        
        const isSharp = note.includes('#')
        const isActiveNote = activeNote === note && isActive
        
        return (
          <div
            key={note}
            className={cn(
              'absolute flex items-center justify-center',
              'rounded-full font-semibold',
              'transition-all duration-150',
              fontSize,
              // Active note styling
              isActiveNote
                ? isInTune
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-125 z-10'
                  : 'bg-primary text-white shadow-lg shadow-primary/30 scale-125 z-10'
                : isSharp
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
            )}
            style={{
              width: noteSize,
              height: noteSize,
              left: x - noteSize / 2,
              top: y - noteSize / 2,
            }}
          >
            {note}
          </div>
        )
      })}

      {/* Active note glow effect */}
      {isActive && activeNote && (
        <div
          className={cn(
            'absolute rounded-full pointer-events-none',
            'animate-ping opacity-30',
            isInTune ? 'bg-emerald-500' : 'bg-primary'
          )}
          style={{
            width: noteSize + 10,
            height: noteSize + 10,
            left: center + noteRadius * Math.cos((ALL_NOTES.indexOf(activeNote) * 30 - 90) * (Math.PI / 180)) - (noteSize + 10) / 2,
            top: center + noteRadius * Math.sin((ALL_NOTES.indexOf(activeNote) * 30 - 90) * (Math.PI / 180)) - (noteSize + 10) / 2,
          }}
        />
      )}
    </div>
  )
}
