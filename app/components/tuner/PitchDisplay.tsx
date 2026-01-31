import { cn } from '~/lib/utils'
import type { NoteName } from '~/types/tuner'

export interface PitchDisplayProps {
  /** Detected note name */
  note: NoteName | null
  /** Octave number */
  octave: number | null
  /** Frequency in Hz */
  frequency: number | null
  /** Cents deviation from perfect pitch */
  cents: number | null
  /** Whether the tuner is actively listening */
  isActive: boolean
  /** Optional className */
  className?: string
}

/**
 * Displays the detected pitch information
 * Shows note name, frequency, and cents deviation
 */
export function PitchDisplay({
  note,
  octave,
  frequency,
  cents,
  isActive,
  className,
}: PitchDisplayProps) {
  const isInTune = cents !== null && Math.abs(cents) <= 5
  
  // Format frequency with appropriate precision
  const formatFrequency = (freq: number | null): string => {
    if (freq === null) return '---'
    if (freq >= 1000) return freq.toFixed(1)
    if (freq >= 100) return freq.toFixed(2)
    return freq.toFixed(2)
  }
  
  // Format cents with sign
  const formatCents = (c: number | null): string => {
    if (c === null) return '---'
    if (c === 0) return '0'
    return c > 0 ? `+${c}` : `${c}`
  }

  return (
    <div 
      className={cn(
        'flex flex-col items-center gap-4',
        className
      )}
    >
      {/* Main Note Display */}
      <div className="flex items-baseline gap-1">
        <span 
          className={cn(
            'text-[96px] font-bold leading-none tracking-tight',
            'transition-colors duration-200',
            !isActive 
              ? 'text-slate-300 dark:text-slate-600'
              : note 
                ? isInTune
                  ? 'text-emerald-500'
                  : 'text-slate-900 dark:text-white'
                : 'text-slate-300 dark:text-slate-600'
          )}
        >
          {note || '-'}
        </span>
        {octave !== null && (
          <span 
            className={cn(
              'text-3xl font-semibold',
              'transition-colors duration-200',
              !isActive 
                ? 'text-slate-300 dark:text-slate-600'
                : 'text-slate-500 dark:text-slate-400'
            )}
          >
            {octave}
          </span>
        )}
      </div>

      {/* Frequency Display */}
      <div className="flex flex-col items-center gap-1">
        <span 
          className={cn(
            'text-2xl font-mono font-medium tabular-nums',
            'transition-colors duration-200',
            !isActive 
              ? 'text-slate-300 dark:text-slate-600'
              : 'text-slate-700 dark:text-slate-300'
          )}
        >
          {formatFrequency(frequency)} Hz
        </span>
      </div>

      {/* Cents Display */}
      <div 
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full',
          'transition-colors duration-200',
          !isActive 
            ? 'bg-slate-100 dark:bg-slate-800'
            : isInTune
              ? 'bg-emerald-100 dark:bg-emerald-900/30'
              : cents !== null && cents > 0
                ? 'bg-amber-100 dark:bg-amber-900/30'
                : cents !== null && cents < 0
                  ? 'bg-rose-100 dark:bg-rose-900/30'
                  : 'bg-slate-100 dark:bg-slate-800'
        )}
      >
        <span 
          className={cn(
            'text-lg font-semibold tabular-nums',
            'transition-colors duration-200',
            !isActive 
              ? 'text-slate-400 dark:text-slate-500'
              : isInTune
                ? 'text-emerald-600 dark:text-emerald-400'
                : cents !== null && cents > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : cents !== null && cents < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-400 dark:text-slate-500'
          )}
        >
          {formatCents(cents)} cents
        </span>
      </div>

      {/* Status indicator */}
      {isActive && !note && (
        <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">
          Listening for pitch...
        </p>
      )}
    </div>
  )
}
