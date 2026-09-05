import { ReactNode, useState } from 'react'
import { Minus, Plus, Music2, ListMusic, Library, Check, RotateCcw } from 'lucide-react'
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
    <div
      data-testid="settings-row"
      className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="sm:flex-1 sm:mr-4">
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

export interface SettingsStepperProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  /** Custom display for the value (e.g. a note name instead of a raw number). Defaults to the raw value. */
  format?: (value: number) => string
  disabled?: boolean
}

/** Discrete -/value/+ stepper — the shared control behind every numeric player setting (font size, margins, transpose, etc). */
export function SettingsStepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  disabled,
}: SettingsStepperProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        disabled={disabled || value <= min}
        className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="min-w-[2.5rem] text-center text-sm font-medium text-slate-900 dark:text-white">
        {format ? format(value) : value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        disabled={disabled || value >= max}
        className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  )
}

export interface SettingsColorFieldProps {
  value: string
  onChange: (value: string) => void
  /** Present only for nullable/overridable colors (e.g. background, lyrics text) — omit for always-on colors. */
  onReset?: () => void
}

/** Native color swatch + optional reset-to-theme-default button. */
export function SettingsColorField({ value, onChange, onReset }: SettingsColorFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-9 h-9 rounded-lg border border-slate-200 dark:border-[#3b3f54] cursor-pointer bg-transparent p-0.5"
      />
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          title="Restaurar color por defecto"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

export type SaveTier = 'song' | 'setlist' | 'library'

export interface SaveTierButtonsProps {
  onSave: (tier: SaveTier) => void
  /** Only true when the player is opened from within a setlist — otherwise there's nothing to attach the override to. */
  canSaveForSetlist?: boolean
}

const SAVE_TIER_CONFIG: Record<SaveTier, { icon: typeof Music2; label: string; title: string }> = {
  song: { icon: Music2, label: 'Canción', title: 'Guardar solo para esta canción' },
  setlist: { icon: ListMusic, label: 'Setlist', title: 'Guardar para este setlist' },
  library: { icon: Library, label: 'Librería', title: 'Guardar como default de toda la librería' },
}

/**
 * Compact icon+label buttons for the 3-tier save (song / setlist / library)
 * shared by every player setting. Replaces verbose text-only buttons.
 */
export function SaveTierButtons({ onSave, canSaveForSetlist = false }: SaveTierButtonsProps) {
  const [flash, setFlash] = useState<SaveTier | null>(null)

  const trigger = (tier: SaveTier) => {
    onSave(tier)
    setFlash(tier)
    setTimeout(() => setFlash(null), 1200)
  }

  const tiers: SaveTier[] = canSaveForSetlist ? ['song', 'setlist', 'library'] : ['song', 'library']

  return (
    <div className="flex items-center gap-1.5 mt-1">
      {tiers.map((tier) => {
        const { icon: Icon, label, title } = SAVE_TIER_CONFIG[tier]
        const saved = flash === tier
        return (
          <button
            key={tier}
            type="button"
            onClick={() => trigger(tier)}
            title={title}
            className="flex items-center gap-1 text-[10px] leading-none px-1.5 py-1 rounded bg-slate-200/60 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
          >
            {saved ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
