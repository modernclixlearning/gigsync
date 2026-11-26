/**
 * A time signature chosen freely: how many beats a bar has (1 to 12) and which
 * note gets the beat (2, 4 or 8) — two selects instead of a short list, so
 * 12/8, 11/8 or 1/4 are one choice away. The value is the usual text, "12/8".
 *
 * A saved signature outside those ranges (a song imported with 5/16, say) is
 * kept as a choice of its own, so opening the form never changes it.
 */

import { cn } from '~/lib/utils'

export const TIME_SIGNATURE_NUMERATORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const
export const TIME_SIGNATURE_DENOMINATORS = [2, 4, 8] as const

/** "12/8" → { beats: 12, unit: 8 }; null when it is not a signature. */
export function splitTimeSignature(value: string | undefined | null): { beats: number; unit: number } | null {
  const match = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(value ?? '')
  if (!match) return null
  const beats = Number(match[1])
  const unit = Number(match[2])
  return beats >= 1 && unit >= 1 ? { beats, unit } : null
}

export interface TimeSignaturePickerProps {
  value: string
  onChange: (signature: string) => void
  /** Classes of each select (the two look the same). */
  selectClassName?: string
  className?: string
}

const defaultSelectClass = cn(
  'h-11 min-w-0 flex-1 rounded-xl px-3',
  'bg-white dark:bg-[#1a1f36]',
  'border border-slate-200 dark:border-slate-700',
  'text-slate-900 dark:text-white',
  'focus:outline-none focus:ring-2 focus:ring-indigo-500'
)

export function TimeSignaturePicker({ value, onChange, selectClassName, className }: TimeSignaturePickerProps) {
  const current = splitTimeSignature(value) ?? { beats: 4, unit: 4 }
  const beatOptions: number[] = [...TIME_SIGNATURE_NUMERATORS]
  if (!beatOptions.includes(current.beats)) beatOptions.push(current.beats)
  const unitOptions: number[] = [...TIME_SIGNATURE_DENOMINATORS]
  if (!unitOptions.includes(current.unit)) unitOptions.push(current.unit)
  const selectClass = selectClassName ?? defaultSelectClass

  return (
    <div role="group" aria-label="Compás" className={cn('flex items-center gap-2', className)}>
      <select
        aria-label="Tiempos por compás"
        value={current.beats}
        onChange={(event) => onChange(`${event.target.value}/${current.unit}`)}
        className={selectClass}
      >
        {beatOptions.map((beats) => (
          <option key={beats} value={beats}>
            {beats}
          </option>
        ))}
      </select>
      <span aria-hidden className="text-lg font-semibold text-slate-400">
        /
      </span>
      <select
        aria-label="Figura que marca el tiempo"
        value={current.unit}
        onChange={(event) => onChange(`${current.beats}/${event.target.value}`)}
        className={selectClass}
      >
        {unitOptions.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>
    </div>
  )
}
