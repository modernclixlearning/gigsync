import { motion } from 'framer-motion'
import { cn } from '~/lib/utils'

export interface VisualBeatProps {
  count: number
  activeIndex: number
  isPlaying?: boolean
  variant?: 'dots' | 'circles' | 'bars'
  glow?: boolean
  className?: string
}

export function VisualBeat({
  count,
  activeIndex,
  isPlaying = false,
  variant = 'circles',
  glow = true,
  className,
}: VisualBeatProps) {
  const beats = Array.from({ length: count }, (_, i) => i)

  const baseStyles = {
    dots: 'w-3 h-3 rounded-full',
    circles: 'w-5 h-5 rounded-full border-2',
    bars: 'w-2 h-8 rounded-full',
  }

  const activeStyles = {
    dots: 'bg-primary',
    circles: 'bg-primary border-primary',
    bars: 'bg-primary',
  }

  const inactiveStyles = {
    dots: 'bg-slate-300 dark:bg-slate-600',
    circles: 'bg-transparent border-slate-300 dark:border-slate-600',
    bars: 'bg-slate-300 dark:bg-slate-600',
  }

  const accentStyles = {
    dots: 'w-4 h-4',
    circles: 'w-6 h-6 border-[3px]',
    bars: 'w-3 h-10',
  }

  return (
    <div 
      className={cn(
        'flex items-center justify-center gap-4',
        className
      )}
    >
      {beats.map((beat) => {
        const isActive = isPlaying && activeIndex === beat + 1
        const isAccent = beat === 0

        return (
          <motion.div
            key={beat}
            className={cn(
              baseStyles[variant],
              isAccent && accentStyles[variant],
              isActive ? activeStyles[variant] : inactiveStyles[variant],
              isActive && glow && 'shadow-[0_0_12px_rgba(19,55,236,1)]',
              'transition-colors duration-75'
            )}
            animate={isActive ? {
              scale: [1, 1.2, 1],
            } : {}}
            transition={{
              duration: 0.1,
              ease: 'easeOut',
            }}
          />
        )
      })}
    </div>
  )
}
