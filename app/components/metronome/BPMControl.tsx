import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { cn } from '~/lib/utils'

export interface BPMControlProps {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
  size?: 'md' | 'lg' | 'xl'
  showGlow?: boolean
  className?: string
}

export function BPMControl({
  value,
  min = 20,
  max = 300,
  onChange,
  size = 'xl',
  showGlow = true,
  className,
}: BPMControlProps) {
  const sizeClasses = {
    md: 'w-48 h-48',
    lg: 'w-56 h-56',
    xl: 'w-72 h-72',
  }

  const handleIncrement = useCallback(() => {
    if (value < max) {
      onChange(value + 1)
    }
  }, [value, max, onChange])

  const handleDecrement = useCallback(() => {
    if (value > min) {
      onChange(value - 1)
    }
  }, [value, min, onChange])

  const handleFineIncrement = useCallback(() => {
    if (value + 5 <= max) {
      onChange(value + 5)
    } else {
      onChange(max)
    }
  }, [value, max, onChange])

  const handleFineDecrement = useCallback(() => {
    if (value - 5 >= min) {
      onChange(value - 5)
    } else {
      onChange(min)
    }
  }, [value, min, onChange])

  // Calculate rotation angle based on BPM value
  const normalizedValue = (value - min) / (max - min)
  const rotationAngle = normalizedValue * 270 - 135 // -135 to 135 degrees

  return (
    <div className={cn('flex flex-col items-center gap-6', className)}>
      {/* Dial */}
      <div 
        className={cn(
          sizeClasses[size],
          'relative rounded-full',
          'bg-slate-100 dark:bg-[#232948]',
          'border-4 border-slate-200 dark:border-[#3b3f54]',
          showGlow && 'shadow-lg shadow-primary/10',
        )}
      >
        {/* Dial Track */}
        <div className="absolute inset-4 rounded-full border-2 border-slate-200 dark:border-[#3b3f54]" />
        
        {/* Dial Indicator */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ rotate: rotationAngle }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div 
            className={cn(
              'absolute top-6 w-3 h-3 rounded-full',
              'bg-primary',
              showGlow && 'shadow-[0_0_8px_rgba(19,55,236,0.8)]'
            )}
          />
        </motion.div>

        {/* Center Value Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-slate-900 dark:text-white">
            {value}
          </span>
          <span className="text-xs font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">
            BPM
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-4">
        {/* Large Decrement */}
        <button
          onClick={handleFineDecrement}
          className={cn(
            'flex items-center justify-center',
            'w-12 h-12 rounded-full',
            'bg-slate-200 dark:bg-[#232948]',
            'text-slate-700 dark:text-slate-300',
            'hover:bg-slate-300 dark:hover:bg-[#2d3454]',
            'active:scale-95 transition-all',
            'text-lg font-bold'
          )}
          aria-label="Decrease BPM by 5"
        >
          -5
        </button>

        {/* Small Decrement */}
        <button
          onClick={handleDecrement}
          className={cn(
            'flex items-center justify-center',
            'w-14 h-14 rounded-full',
            'bg-slate-200 dark:bg-[#232948]',
            'text-slate-700 dark:text-slate-300',
            'hover:bg-slate-300 dark:hover:bg-[#2d3454]',
            'active:scale-95 transition-all',
            'text-2xl font-bold'
          )}
          aria-label="Decrease BPM"
        >
          −
        </button>

        {/* Small Increment */}
        <button
          onClick={handleIncrement}
          className={cn(
            'flex items-center justify-center',
            'w-14 h-14 rounded-full',
            'bg-slate-200 dark:bg-[#232948]',
            'text-slate-700 dark:text-slate-300',
            'hover:bg-slate-300 dark:hover:bg-[#2d3454]',
            'active:scale-95 transition-all',
            'text-2xl font-bold'
          )}
          aria-label="Increase BPM"
        >
          +
        </button>

        {/* Large Increment */}
        <button
          onClick={handleFineIncrement}
          className={cn(
            'flex items-center justify-center',
            'w-12 h-12 rounded-full',
            'bg-slate-200 dark:bg-[#232948]',
            'text-slate-700 dark:text-slate-300',
            'hover:bg-slate-300 dark:hover:bg-[#2d3454]',
            'active:scale-95 transition-all',
            'text-lg font-bold'
          )}
          aria-label="Increase BPM by 5"
        >
          +5
        </button>
      </div>
    </div>
  )
}
