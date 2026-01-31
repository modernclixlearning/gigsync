import { cn } from '~/lib/utils'

export interface TimeSignatureSelectorProps {
  value: string
  onChange: (signature: string) => void
  className?: string
}

const TIME_SIGNATURES = [
  { value: '2/4', label: '2/4' },
  { value: '3/4', label: '3/4' },
  { value: '4/4', label: '4/4' },
  { value: '5/4', label: '5/4' },
  { value: '6/8', label: '6/8' },
  { value: '7/8', label: '7/8' },
  { value: '9/8', label: '9/8' },
  { value: '12/8', label: '12/8' },
]

export function TimeSignatureSelector({
  value,
  onChange,
  className,
}: TimeSignatureSelectorProps) {
  return (
    <div className={cn('w-full', className)}>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Time Signature
      </h3>
      
      {/* Horizontal scrollable container */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {TIME_SIGNATURES.map((sig) => {
          const isActive = value === sig.value
          
          return (
            <button
              key={sig.value}
              onClick={() => onChange(sig.value)}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-full',
                'text-sm font-semibold',
                'transition-all duration-200',
                'active:scale-95',
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-slate-100 dark:bg-[#232948] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2d3454]'
              )}
              aria-pressed={isActive}
              aria-label={`Time signature ${sig.label}`}
            >
              {sig.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
