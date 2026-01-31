import { cn } from '~/lib/utils'
import type { CalibrationSettings } from '~/types/tuner'

export interface CalibrationControlProps {
  /** Current calibration settings */
  calibration: CalibrationSettings
  /** Callback when calibration changes */
  onChange: (settings: Partial<CalibrationSettings>) => void
  /** Optional className */
  className?: string
}

/**
 * Control component for tuner calibration settings
 * Allows adjusting reference frequency (A4) and sensitivity
 */
export function CalibrationControl({
  calibration,
  onChange,
  className,
}: CalibrationControlProps) {
  const { referenceFrequency, sensitivity } = calibration

  // Common A4 reference frequencies
  const commonFrequencies = [432, 440, 442, 444]

  const handleFrequencyChange = (freq: number) => {
    onChange({ referenceFrequency: freq })
  }

  const handleFrequencyInput = (value: string) => {
    const freq = parseFloat(value)
    if (!isNaN(freq) && freq >= 400 && freq <= 480) {
      onChange({ referenceFrequency: freq })
    }
  }

  const handleSensitivityChange = (value: number) => {
    onChange({ sensitivity: Math.max(0, Math.min(1, value)) })
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Reference Frequency Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Reference Pitch (A4)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={referenceFrequency}
              onChange={(e) => handleFrequencyInput(e.target.value)}
              min={400}
              max={480}
              step={0.1}
              className={cn(
                'w-20 px-2 py-1 text-center text-sm font-mono',
                'bg-slate-100 dark:bg-slate-800 rounded-lg',
                'border border-slate-200 dark:border-slate-700',
                'focus:outline-none focus:ring-2 focus:ring-primary/50',
                'text-slate-900 dark:text-white'
              )}
            />
            <span className="text-sm text-slate-500 dark:text-slate-400">Hz</span>
          </div>
        </div>

        {/* Quick frequency buttons */}
        <div className="flex flex-wrap gap-2">
          {commonFrequencies.map((freq) => (
            <button
              key={freq}
              onClick={() => handleFrequencyChange(freq)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium',
                'transition-all duration-150',
                referenceFrequency === freq
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              {freq} Hz
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Standard concert pitch is A4 = 440 Hz. Some orchestras use 442 Hz.
        </p>
      </div>

      {/* Sensitivity Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Detection Sensitivity
          </label>
          <span className="text-sm font-mono text-slate-500 dark:text-slate-400">
            {Math.round(sensitivity * 100)}%
          </span>
        </div>

        {/* Sensitivity slider */}
        <div className="relative">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={sensitivity}
            onChange={(e) => handleSensitivityChange(parseFloat(e.target.value))}
            className={cn(
              'w-full h-2 rounded-full appearance-none cursor-pointer',
              'bg-slate-200 dark:bg-slate-700',
              '[&::-webkit-slider-thumb]:appearance-none',
              '[&::-webkit-slider-thumb]:w-5',
              '[&::-webkit-slider-thumb]:h-5',
              '[&::-webkit-slider-thumb]:rounded-full',
              '[&::-webkit-slider-thumb]:bg-primary',
              '[&::-webkit-slider-thumb]:shadow-md',
              '[&::-webkit-slider-thumb]:cursor-pointer',
              '[&::-webkit-slider-thumb]:transition-transform',
              '[&::-webkit-slider-thumb]:hover:scale-110'
            )}
          />
        </div>

        {/* Sensitivity labels */}
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Less sensitive</span>
          <span>More sensitive</span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Higher sensitivity picks up quieter sounds but may detect more noise.
        </p>
      </div>

      {/* Reset button */}
      <button
        onClick={() => onChange({ referenceFrequency: 440, sensitivity: 0.5 })}
        className={cn(
          'w-full px-4 py-2 rounded-lg',
          'text-sm font-medium',
          'bg-slate-100 dark:bg-slate-800',
          'text-slate-700 dark:text-slate-300',
          'hover:bg-slate-200 dark:hover:bg-slate-700',
          'transition-colors duration-150'
        )}
      >
        Reset to Defaults
      </button>
    </div>
  )
}
