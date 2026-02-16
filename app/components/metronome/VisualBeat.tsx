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
        'flex items-center justify-center gap-2',
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
              isActive && glow && 'shadow-[0_0_16px_rgba(99,102,241,0.8)] dark:shadow-[0_0_16px_rgba(129,140,248,0.9)]',
              'transition-colors duration-75'
            )}
            animate={isActive ? {
              scale: [1, 1.3, 1],
            } : {}}
            transition={{
              duration: 0.15,
              ease: 'easeOut',
            }}
          />
        )
      })}
    </div>
  )
}
