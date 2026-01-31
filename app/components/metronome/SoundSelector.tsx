import { cn } from '~/lib/utils'

export type MetronomeSound = 'classic' | 'woodblock' | 'sticks' | 'electronic' | 'silent'

export interface SoundSelectorProps {
  value: MetronomeSound
  onChange: (sound: MetronomeSound) => void
  className?: string
}

const SOUNDS: Array<{
  value: MetronomeSound
  label: string
  icon: string
  description: string
}> = [
  {
    value: 'classic',
    label: 'Classic',
    icon: '🎵',
    description: 'Traditional click',
  },
  {
    value: 'woodblock',
    label: 'Woodblock',
    icon: '🪵',
    description: 'Wooden tone',
  },
  {
    value: 'sticks',
    label: 'Sticks',
    icon: '🥢',
    description: 'Drumstick click',
  },
  {
    value: 'electronic',
    label: 'Electronic',
    icon: '⚡',
    description: 'Digital beep',
  },
  {
    value: 'silent',
    label: 'Silent',
    icon: '🔇',
    description: 'Visual only',
  },
]

export function SoundSelector({
  value,
  onChange,
  className,
}: SoundSelectorProps) {
  return (
    <div className={cn('w-full', className)}>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Sound
      </h3>
      
      {/* Grid of sound options */}
      <div className="grid grid-cols-2 gap-3">
        {SOUNDS.map((sound) => {
          const isActive = value === sound.value
          
          return (
            <button
              key={sound.value}
              onClick={() => onChange(sound.value)}
              className={cn(
                'flex flex-col items-center justify-center gap-2',
                'p-4 rounded-xl',
                'transition-all duration-200',
                'active:scale-95',
                'border-2',
                isActive
                  ? 'bg-primary/10 dark:bg-primary/20 border-primary text-primary'
                  : 'bg-white dark:bg-[#111218] border-slate-200 dark:border-[#3b3f54] hover:bg-slate-50 dark:hover:bg-white/5'
              )}
              aria-pressed={isActive}
              aria-label={`${sound.label} sound: ${sound.description}`}
            >
              <span className="text-2xl" role="img" aria-hidden="true">
                {sound.icon}
              </span>
              <span 
                className={cn(
                  'text-sm font-semibold',
                  isActive ? 'text-primary' : 'text-slate-700 dark:text-slate-300'
                )}
              >
                {sound.label}
              </span>
              <span 
                className={cn(
                  'text-xs',
                  isActive ? 'text-primary/70' : 'text-slate-500 dark:text-slate-400'
                )}
              >
                {sound.description}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
