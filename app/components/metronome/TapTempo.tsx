import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Hand } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useTapTempo } from '~/hooks/useTapTempo'

export interface TapTempoProps {
  onBpmDetected: (bpm: number) => void
  className?: string
}

/**
 * Tap tempo: tap the beat, the tempo you are tapping shows on the button and
 * is applied as you go (from the second tap) — no separate "apply" step.
 */
export function TapTempo({ onBpmDetected, className }: TapTempoProps) {
  const { tap, calculatedBpm, taps } = useTapTempo()

  const onBpmDetectedRef = useRef(onBpmDetected)
  onBpmDetectedRef.current = onBpmDetected
  useEffect(() => {
    if (calculatedBpm) onBpmDetectedRef.current(calculatedBpm)
  }, [calculatedBpm])

  return (
    <motion.button
      type="button"
      onClick={tap}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'flex h-14 min-w-28 shrink-0 flex-col items-center justify-center rounded-full px-5',
        'bg-slate-200/70 dark:bg-[#232948] text-slate-900 dark:text-white',
        'hover:bg-slate-200 dark:hover:bg-[#2d3454] transition-colors',
        className
      )}
      aria-label="Marcar el tempo con toques"
      title="Toca al ritmo para fijar el tempo"
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <Hand className="h-4 w-4" /> Tap
      </span>
      <span className="text-[11px] leading-none text-slate-500 dark:text-slate-400 tabular-nums">
        {taps.length === 0 ? 'toca el pulso' : calculatedBpm ? `${calculatedBpm} BPM` : 'sigue…'}
      </span>
    </motion.button>
  )
}
