import type { ComponentType, ReactNode } from 'react'
import { Drum, Guitar, Music2, Piano, Timer, Volume2, VolumeX, type LucideProps } from 'lucide-react'
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

type Icon = ComponentType<LucideProps>

/** One look per channel: the icon bubble and the volume slider share its color. */
const LOOKS = {
  metronome: { icon: Timer, bubble: 'bg-amber-100 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300', accent: 'accent-amber-500' },
  keys: { icon: Piano, bubble: 'bg-sky-100 text-sky-700 dark:bg-sky-500/25 dark:text-sky-300', accent: 'accent-sky-500' },
  bass: { icon: Guitar, bubble: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300', accent: 'accent-emerald-500' },
  drums: { icon: Drum, bubble: 'bg-rose-100 text-rose-700 dark:bg-rose-500/25 dark:text-rose-300', accent: 'accent-rose-500' },
} as const

const BASS_ICONS: Record<BassVoice, Icon> = { electric: Guitar, upright: Music2 }

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
function SourceBadge({ channel }: { channel: BandChannel }) {
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
function IconChoices<T extends string>({
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

function PatternChoices({
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

function ChannelTile({
  channel,
  label,
  source,
  children,
}: {
  channel: BandChannel | 'metronome'
  label: string
  source: ChannelSource
  children?: ReactNode
}) {
  const look = LOOKS[channel]
  const TileIcon = look.icon
  return (
    <div
      className={cn(
        'h-full rounded-2xl p-3 flex flex-col gap-3 border shadow-sm transition-colors',
        'bg-slate-50 dark:bg-[#1a1f36] border-slate-300 dark:border-slate-600'
      )}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <button
          type="button"
          role="switch"
          aria-checked={source.enabled}
          aria-label={label}
          onClick={source.onToggle}
          className={cn(
            'w-14 h-14 shrink-0 rounded-full flex items-center justify-center transition-all',
            source.enabled ? look.bubble : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300',
            source.enabled && 'ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-[#1a1f36] ring-current'
          )}
        >
          <TileIcon className="w-6 h-6" aria-hidden />
        </button>
        <div className="min-w-0 space-y-0.5 flex flex-col items-center">
          <p className="font-semibold text-sm text-slate-900 dark:text-white">{label}</p>
          {/* The line is always there so the volume sliders line up across tiles. */}
          <div className="h-4 flex items-center">
            {channel === 'metronome' ? (
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Click</p>
            ) : (
              <SourceBadge channel={channel} />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {source.volume === 0 ? (
          <VolumeX className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
        ) : (
          <Volume2 className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
        )}
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={source.volume}
          aria-label={`Volumen: ${label.toLowerCase()}`}
          onChange={(event) => source.onVolumeChange(Number(event.target.value))}
          className={cn('w-full h-1.5 cursor-pointer', look.accent)}
        />
        <span className="w-9 shrink-0 text-right text-[11px] font-medium tabular-nums text-slate-600 dark:text-slate-300">{source.volume}%</span>
      </div>

      {children && <div className="mt-auto">{children}</div>}
    </div>
  )
}

export interface BandChannelTilesProps {
  metronome: ChannelSource
  /** Keyboard (a piano): the full chord, in stereo. */
  chords: ChannelSource
  bass?: ChannelSource & { voice: BassVoice; onVoiceChange: (voice: BassVoice) => void }
  drums?: ChannelSource & { pattern: DrumPattern; onPatternChange: (pattern: DrumPattern) => void }
}

/**
 * The band's channels as tiles: a colored icon that switches the channel on and
 * off, its volume, where its sound comes from (samples or synth) and its
 * choices (sound, rhythm) as icons instead of words.
 */
export function BandChannelTiles({ metronome, chords, bass, drums }: BandChannelTilesProps) {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-3 items-stretch">
      <ChannelTile channel="metronome" label="Metrónomo" source={metronome} />
      <ChannelTile channel="keys" label="Acordes" source={chords} />
      {bass && (
        <ChannelTile channel="bass" label="Bajo" source={bass}>
          <IconChoices
            label="Sonido del bajo"
            options={BASS_VOICES}
            labels={BASS_VOICE_LABELS}
            icons={BASS_ICONS}
            value={bass.voice}
            onChange={bass.onVoiceChange}
            disabled={!bass.enabled}
          />
        </ChannelTile>
      )}
      {drums && (
        <ChannelTile channel="drums" label="Batería" source={drums}>
          <PatternChoices value={drums.pattern} onChange={drums.onPatternChange} disabled={!drums.enabled} />
        </ChannelTile>
      )}
    </div>
  )
}
