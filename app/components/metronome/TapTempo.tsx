import { motion } from 'framer-motion'
import { cn } from '~/lib/utils'
import { useTapTempo } from '~/hooks/useTapTempo'

export interface TapTempoProps {
  onBpmDetected: (bpm: number) => void
  className?: string
}

export function TapTempo({ onBpmDetected, className }: TapTempoProps) {
  const { tap, calculatedBpm, taps, reset } = useTapTempo()

  const handleTap = () => {
    tap()
  }

  const handleApply = () => {
    if (calculatedBpm) {
      onBpmDetected(calculatedBpm)
      reset()
    }
  }

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Tap Button */}
      <motion.button
        onClick={handleTap}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'flex items-center justify-center',
          'w-24 h-24 rounded-full',
          'bg-primary text-white',
          'font-bold text-lg',
          'shadow-lg shadow-primary/30',
          'active:bg-primary-dark',
          'transition-colors'
        )}
        aria-label="Tap to detect tempo"
      >
        TAP
      </motion.button>

      {/* Feedback Area */}
      <div className="flex flex-col items-center gap-2 min-h-[60px]">
        {/* Tap Count */}
        {taps.length > 0 && (
          <div className="flex gap-1">
            {Array.from({ length: Math.min(taps.length, 8) }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-2 h-2 rounded-full bg-primary"
              />
            ))}
          </div>
        )}

        {/* Calculated BPM */}
        {calculatedBpm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {calculatedBpm} BPM
            </span>
            
            {/* Apply Button */}
            <button
              onClick={handleApply}
              className={cn(
                'px-4 py-2 rounded-lg',
                'bg-primary/10 dark:bg-primary/20 text-primary',
                'text-sm font-semibold',
                'hover:bg-primary/20 dark:hover:bg-primary/30',
                'active:scale-95 transition-all'
              )}
            >
              Apply
            </button>
          </motion.div>
        )}

        {/* Helper Text */}
        {taps.length === 0 && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Tap the button to detect tempo
          </span>
        )}
        
        {taps.length === 1 && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Keep tapping...
          </span>
        )}
      </div>
    </div>
  )
}
