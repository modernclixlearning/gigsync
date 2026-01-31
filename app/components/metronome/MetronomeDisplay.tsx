import { cn } from '~/lib/utils'
import { VisualBeat } from './VisualBeat'

export interface MetronomeDisplayProps {
  bpm: number
  currentBeat: number
  timeSignature: string
  isPlaying: boolean
  className?: string
}

function parseTimeSignature(signature: string): number {
  const [beats] = signature.split('/').map(Number)
  return beats || 4
}

export function MetronomeDisplay({
  bpm,
  currentBeat,
  timeSignature,
  isPlaying,
  className,
}: MetronomeDisplayProps) {
  const beatsPerMeasure = parseTimeSignature(timeSignature)

  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center gap-8 py-8',
        className
      )}
    >
      {/* Visual Beat Indicator */}
      <VisualBeat
        count={beatsPerMeasure}
        activeIndex={currentBeat}
        isPlaying={isPlaying}
        variant="circles"
        glow
      />

      {/* BPM Display */}
      <div className="flex flex-col items-center gap-2">
        <span 
          className={cn(
            'text-[72px] font-bold leading-none tracking-tight',
            'text-slate-900 dark:text-white',
            isPlaying && 'text-primary'
          )}
        >
          {bpm}
        </span>
        <span className="text-sm font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">
          BPM
        </span>
      </div>

      {/* Time Signature Display */}
      <div className="flex items-center justify-center">
        <span className="text-2xl font-semibold text-slate-700 dark:text-slate-300">
          {timeSignature}
        </span>
      </div>
    </div>
  )
}
