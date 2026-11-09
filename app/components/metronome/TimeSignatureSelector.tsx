import { cn } from '~/lib/utils'
import { SectionTitle } from '~/components/layout'

export interface TimeSignatureSelectorProps {
  value: string
  onChange: (signature: string) => void
  className?: string
}

const TIME_SIGNATURES = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '12/8']

export function TimeSignatureSelector({
  value,
  onChange,
  className,
}: TimeSignatureSelectorProps) {
  return (
    <div className={cn('w-full', className)}>
      <SectionTitle className="mb-3 text-center">Compás</SectionTitle>

      {/* 4 × 2: every signature in view, no sideways scrolling */}
      <div className="grid grid-cols-4 gap-2">
        {TIME_SIGNATURES.map((signature) => {
          const isActive = value === signature

          return (
            <button
              key={signature}
              type="button"
              onClick={() => onChange(signature)}
              className={cn(
                'h-10 rounded-xl text-sm font-semibold tabular-nums transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'bg-slate-200/70 dark:bg-[#232948] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2d3454]'
              )}
              aria-pressed={isActive}
              aria-label={`Compás de ${signature}`}
            >
              {signature}
            </button>
          )
        })}
      </div>
    </div>
  )
}
