import type { ComponentType } from 'react'
import { Drum, Guitar, Music2, Piano, Sparkles, Timer, type LucideProps } from 'lucide-react'
import { cn } from '~/lib/utils'
import {
  BASS_VOICES,
  BASS_VOICE_LABELS,
  DRUM_PATTERNS,
  DRUM_PATTERN_DEFS,
  DRUM_PATTERN_LABELS,
  STEPS_PER_BEAT,
  type BassVoice,
  type DrumPattern,
} from '~/lib/audio/bandSound'
import { SOUND_STATUS_LABELS, useSoundStatuses, type BandChannel, type SoundSourceStatus } from '~/lib/audio/soundStatus'

export interface ChannelSource {
  enabled: boolean
  onToggle: () => void
  /** 0–100 */
  volume: number
  onVolumeChange: (volume: number) => void
}

export type Icon = ComponentType<LucideProps>

/** One look per channel: the icon bubble and the volume slider share its color. */
export const LOOKS = {
  metronome: { icon: Timer, bubble: 'bg-amber-100 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300', accent: 'accent-amber-500' },
  keys: { icon: Piano, bubble: 'bg-sky-100 text-sky-700 dark:bg-sky-500/25 dark:text-sky-300', accent: 'accent-sky-500' },
  bass: { icon: Guitar, bubble: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300', accent: 'accent-emerald-500' },
  drums: { icon: Drum, bubble: 'bg-rose-100 text-rose-700 dark:bg-rose-500/25 dark:text-rose-300', accent: 'accent-rose-500' },
  lead: { icon: Music2, bubble: 'bg-violet-100 text-violet-700 dark:bg-violet-500/25 dark:text-violet-300', accent: 'accent-violet-500' },
  arrangement: { icon: Sparkles, bubble: 'bg-amber-100 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300', accent: 'accent-amber-500' },
} as const

export const BASS_ICONS: Record<BassVoice, Icon> = { electric: Guitar, upright: Music2 }

const PATTERN_SHORT: Record<DrumPattern, string> = { rock: 'Rock', pop: 'Pop', ballad: 'Balada', bossa: 'Bossa' }

const STATUS_SHORT: Record<Exclude<SoundSourceStatus, 'idle'>, string> = {
  loading: 'Cargando…',
  samples: 'Muestras',
  synth: 'Sintético',
  failed: 'Sin muestras',
}

const STATUS_DOT: Record<Exclude<SoundSourceStatus, 'idle'>, string> = {
  loading: 'bg-amber-500 animate-pulse',
  samples: 'bg-emerald-500',
  synth: 'bg-slate-400',
  failed: 'bg-red-500',
}

/** Where the sound comes from: a dot and one word, the full sentence on hover and for screen readers. */
export function SourceBadge({ channel }: { channel: BandChannel }) {
  const status = useSoundStatuses()[channel]
  if (status === 'idle') return null
  return (
    <p
      data-testid={`sound-status-${channel}`}
      title={`Suena: ${SOUND_STATUS_LABELS[status]}`}
      className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300"
    >
      <span aria-hidden className={cn('w-2 h-2 rounded-full', STATUS_DOT[status])} />
      <span aria-hidden>{STATUS_SHORT[status]}</span>
      <span className="sr-only">Suena: {SOUND_STATUS_LABELS[status]}</span>
    </p>
  )
}

/** Icon-only exclusive choice (a sound): the name is its tooltip and accessible name. */
export function IconChoices<T extends string>({
  label,
  options,
  labels,
  icons,
  value,
  onChange,
  disabled,
}: {
  label: string
  options: readonly T[]
  labels: Record<T, string>
  icons: Record<T, Icon>
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const OptionIcon: Icon = icons[option]
        const selected = value === option
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={labels[option]}
            title={labels[option]}
            disabled={disabled}
            onClick={() => onChange(option)}
            className={cn(
              'h-10 w-full rounded-xl flex items-center justify-center transition-colors disabled:opacity-60',
              selected
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
            )}
          >
            <OptionIcon className="w-5 h-5" aria-hidden />
          </button>
        )
      })}
    </div>
  )
}

/** The pattern (one bar, or two) drawn as dots: hi-hat on top, snare, kick below; brighter = harder. */
export function PatternGlyph({ pattern }: { pattern: DrumPattern }) {
  const def = DRUM_PATTERN_DEFS[pattern]
  const lanes = [def.hat, def.snare, def.kick]
  return (
    <svg viewBox="0 0 64 20" className="w-full h-5" aria-hidden>
      {lanes.map((lane, row) =>
        lane.map((velocity, step) => (
          <circle
            key={`${row}-${step}`}
            cx={(step + 0.5) * (64 / lane.length)}
            cy={3 + row * 7}
            r={(velocity > 0 ? 1.6 : 0.7) * (lane.length > 16 ? 0.6 : 1)}
            fill="currentColor"
            opacity={velocity > 0 ? 0.55 + velocity * 0.45 : 0.3}
            data-beat={step % STEPS_PER_BEAT === 0 ? '' : undefined}
          />
        ))
      )}
    </svg>
  )
}

export function PatternChoices({
  value,
  onChange,
  disabled,
}: {
  value: DrumPattern
  onChange: (pattern: DrumPattern) => void
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label="Patrón de batería" className="grid grid-cols-2 gap-1.5">
      {DRUM_PATTERNS.map((pattern) => {
        const selected = value === pattern
        return (
          <button
            key={pattern}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={DRUM_PATTERN_LABELS[pattern]}
            title={DRUM_PATTERN_LABELS[pattern]}
            disabled={disabled}
            onClick={() => onChange(pattern)}
            className={cn(
              'rounded-xl px-1.5 pt-1.5 pb-1 flex flex-col items-stretch gap-0.5 transition-colors disabled:opacity-60',
              selected
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
            )}
          >
            <PatternGlyph pattern={pattern} />
            <span aria-hidden className="text-[10px] font-medium leading-tight text-center truncate">
              {PATTERN_SHORT[pattern]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
