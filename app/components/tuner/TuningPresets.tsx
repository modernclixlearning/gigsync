import { cn } from '~/lib/utils'
import type { TuningPreset } from '~/types/tuner'
import { DEFAULT_TUNING_PRESETS } from '~/types/tuner'

export interface TuningPresetsProps {
  /** Currently selected preset */
  selectedPreset: TuningPreset | null
  /** Callback when preset is selected */
  onSelect: (preset: TuningPreset | null) => void
  /** Optional additional presets */
  customPresets?: TuningPreset[]
  /** Optional className */
  className?: string
}

/**
 * Selector component for tuning presets
 * Shows common tunings for guitar, bass, ukulele, etc.
 */
export function TuningPresets({
  selectedPreset,
  onSelect,
  customPresets = [],
  className,
}: TuningPresetsProps) {
  const allPresets = [...DEFAULT_TUNING_PRESETS, ...customPresets]
  
  // Group presets by instrument
  const groupedPresets = allPresets.reduce((acc, preset) => {
    if (!acc[preset.instrument]) {
      acc[preset.instrument] = []
    }
    acc[preset.instrument].push(preset)
    return acc
  }, {} as Record<string, TuningPreset[]>)

  // Instrument display names and icons
  const instrumentLabels: Record<string, { label: string; icon: string }> = {
    guitar: { label: 'Guitar', icon: '🎸' },
    bass: { label: 'Bass', icon: '🎸' },
    ukulele: { label: 'Ukulele', icon: '🪕' },
    violin: { label: 'Violin', icon: '🎻' },
    custom: { label: 'Custom', icon: '⚙️' },
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Chromatic mode option */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium',
            'transition-all duration-150',
            selectedPreset === null
              ? 'bg-primary text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
        >
          Chromatic
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Detect any note
        </span>
      </div>

      {/* Grouped presets */}
      {Object.entries(groupedPresets).map(([instrument, presets]) => {
        const { label, icon } = instrumentLabels[instrument] || { label: instrument, icon: '🎵' }
        
        return (
          <div key={instrument} className="space-y-2">
            {/* Instrument header */}
            <div className="flex items-center gap-2">
              <span className="text-lg">{icon}</span>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {label}
              </span>
            </div>
            
            {/* Preset chips */}
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => {
                const isSelected = selectedPreset?.id === preset.id
                const notesString = preset.notes.map(n => n.note).join(' ')
                
                return (
                  <button
                    key={preset.id}
                    onClick={() => onSelect(preset)}
                    className={cn(
                      'group flex flex-col items-start px-3 py-2 rounded-lg',
                      'transition-all duration-150',
                      'text-left',
                      isSelected
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    )}
                  >
                    <span className="text-sm font-medium">{preset.name}</span>
                    <span 
                      className={cn(
                        'text-xs font-mono',
                        isSelected
                          ? 'text-white/70'
                          : 'text-slate-500 dark:text-slate-400'
                      )}
                    >
                      {notesString}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
