import { cn } from '~/lib/utils'
import { SectionTitle } from '~/components/layout'

export type MetronomeSound = 'classic' | 'woodblock' | 'sticks' | 'electronic' | 'silent'

export interface SoundSelectorProps {
  value: MetronomeSound
  onChange: (sound: MetronomeSound) => void
  className?: string
}

const SOUNDS: Array<{
  value: MetronomeSound
  label: string
  description: string
}> = [
  { value: 'classic', label: 'Clásico', description: 'Click tradicional' },
  { value: 'woodblock', label: 'Caja china', description: 'Tono de madera' },
  { value: 'sticks', label: 'Baquetas', description: 'Golpe de baquetas' },
  { value: 'electronic', label: 'Electrónico', description: 'Beep digital' },
  { value: 'silent', label: 'Silencio', description: 'Solo visual' },
]

export function SoundSelector({
  value,
  onChange,
  className,
}: SoundSelectorProps) {
  return (
    <div className={cn('w-full', className)}>
      <SectionTitle className="mb-3 px-1">Sonido</SectionTitle>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
        {SOUNDS.map((sound) => {
          const isActive = value === sound.value

          return (
            <button
              key={sound.value}
              type="button"
              onClick={() => onChange(sound.value)}
              className={cn(
                'flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left',
                'transition-colors',
                isActive
                  ? 'border-primary bg-indigo-50 dark:bg-indigo-500/10'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a2e] hover:border-indigo-300 dark:hover:border-indigo-500/50'
              )}
              aria-pressed={isActive}
              aria-label={`${sound.label}: ${sound.description}`}
            >
              <span
                className={cn(
                  'text-sm font-semibold',
                  isActive ? 'text-primary dark:text-indigo-300' : 'text-slate-900 dark:text-white'
                )}
              >
                {sound.label}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{sound.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
