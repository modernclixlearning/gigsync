import { ReactNode } from 'react'
import { cn } from '~/lib/utils'

export interface SettingsSectionProps {
  title: string
  description?: string
  icon?: string
  children: ReactNode
}

export function SettingsSection({
  title,
  description,
  icon,
  children,
}: SettingsSectionProps) {
  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        {icon && <span className="text-lg">{icon}</span>}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          'rounded-xl overflow-hidden',
          'bg-white dark:bg-[#111218]',
          'border border-slate-200 dark:border-[#3b3f54]',
          'divide-y divide-slate-100 dark:divide-[#3b3f54]'
        )}
      >
        {children}
      </div>
    </section>
  )
}

// Sub-components for common settings patterns

export interface SettingsRowProps {
  label: string
  description?: string
  children: ReactNode
}

export function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex-1 mr-4">
        <p className="font-medium text-slate-900 dark:text-white">{label}</p>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export interface SettingsToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function SettingsToggle({
  checked,
  onChange,
  disabled,
}: SettingsToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-12 h-7 rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-slate-200 dark:bg-[#232948]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all',
          checked ? 'left-[calc(100%-24px)]' : 'left-1'
        )}
      />
    </button>
  )
}

export interface SettingsSelectProps<T extends string> {
  value: T
  options: readonly T[] | T[]
  onChange: (value: T) => void
  disabled?: boolean
}

export function SettingsSelect<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: SettingsSelectProps<T>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      disabled={disabled}
      className={cn(
        'px-3 py-2 rounded-lg',
        'bg-slate-100 dark:bg-[#232948]',
        'text-slate-900 dark:text-white',
        'border-0',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        'cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}

export interface SettingsSliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  showValue?: boolean
  suffix?: string
  disabled?: boolean
}

export function SettingsSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  showValue = true,
  suffix = '',
  disabled,
}: SettingsSliderProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={cn(
          'w-24 h-2 rounded-full appearance-none cursor-pointer',
          'bg-slate-200 dark:bg-[#232948]',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-4',
          '[&::-webkit-slider-thumb]:h-4',
          '[&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-primary',
          '[&::-webkit-slider-thumb]:shadow-lg',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />
      {showValue && (
        <span className="text-sm text-slate-500 dark:text-slate-400 min-w-[3rem] text-right">
          {value}
          {suffix}
        </span>
      )}
    </div>
  )
}
