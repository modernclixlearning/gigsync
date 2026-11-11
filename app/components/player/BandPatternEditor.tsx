/**
 * The band's patterns of this song, written step by step: the drum pattern
 * and the rhythm the bass and the chords are played with. The song still sets
 * the tempo, the meter and the chords — here you only say on which 16th notes
 * each part sounds. Everything is saved with the song as you tap.
 */

import { RotateCcw } from 'lucide-react'
import { cn } from '~/lib/utils'
import {
  DRUM_PATTERNS,
  DRUM_PATTERN_LABELS,
  STEPS_PER_BEAT,
  type DrumPart,
  type DrumPattern,
} from '~/lib/audio/bandSound'
import {
  BASS_RHYTHM_PRESETS,
  CHORD_RHYTHM_PRESETS,
  DRUM_PARTS,
  cleanDrumPattern,
  cleanSongBand,
  drumTemplate,
  fitPattern,
  matchingPreset,
  patternHasHits,
  stepsPerBar,
  toggleStep,
  type RhythmPreset,
  type SongBand,
  type SongDrumPattern,
} from '~/lib/audio/bandPatterns'

export interface BandPatternEditorProps {
  /** What the song has written so far. */
  band: SongBand | undefined
  /** The whole band after a change; `undefined` when nothing of the song's own is left. */
  onChange: (band: SongBand | undefined) => void
  beatsPerBar: number
  /** The built-in rhythm the drums play while the song has no pattern of its own. */
  defaultDrumPattern: DrumPattern
}

type Tone = 'rose' | 'emerald' | 'sky'

/** Fill of a step by how hard it hits — same hue as the channel's tile. */
const STEP_FILL: Record<Tone, Record<string, string>> = {
  rose: { o: 'bg-rose-300 dark:bg-rose-500/40', x: 'bg-rose-500', X: 'bg-rose-700 dark:bg-rose-300' },
  emerald: { o: 'bg-emerald-300 dark:bg-emerald-500/40', x: 'bg-emerald-500', X: 'bg-emerald-700 dark:bg-emerald-300' },
  sky: { o: 'bg-sky-300 dark:bg-sky-500/40', x: 'bg-sky-500', X: 'bg-sky-700 dark:bg-sky-300' },
}

const STEP_NAME: Record<string, string> = { '.': 'silencio', o: 'suave', x: 'normal', X: 'acento' }

const DRUM_PART_LABELS: Record<DrumPart, string> = { hat: 'Hi-hat', snare: 'Caja', kick: 'Bombo' }

const chipClass = (selected: boolean) =>
  cn(
    'h-8 shrink-0 rounded-full px-3 text-xs font-medium transition-colors',
    selected
      ? 'bg-indigo-600 text-white'
      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
  )

/** One lane of steps, a bar per row, grouped by beat. Tap a step: silencio → normal → acento → silencio. */
function StepLane({
  label,
  pattern,
  perBar,
  tone,
  onToggle,
}: {
  label: string
  pattern: string
  perBar: number
  tone: Tone
  onToggle: (index: number) => void
}) {
  const bars = Math.max(1, Math.ceil(pattern.length / perBar))
  return (
    <div role="group" aria-label={label} className="space-y-1">
      {Array.from({ length: bars }, (_, bar) => (
        <div key={bar} className="flex gap-1.5">
          {Array.from({ length: Math.ceil(perBar / STEPS_PER_BEAT) }, (_, beat) => (
            <div key={beat} className="flex min-w-0 flex-1 gap-0.5">
              {Array.from({ length: STEPS_PER_BEAT }, (_, sub) => {
                const index = bar * perBar + beat * STEPS_PER_BEAT + sub
                if (beat * STEPS_PER_BEAT + sub >= perBar) return null
                const char = pattern[index] ?? '.'
                return (
                  <button
                    key={sub}
                    type="button"
                    aria-label={`${label}, paso ${index + 1}: ${STEP_NAME[char]}`}
                    aria-pressed={char !== '.'}
                    data-step={char}
                    onClick={() => onToggle(index)}
                    className={cn(
                      'h-10 sm:h-8 min-w-0 flex-1 rounded-md transition-colors',
                      char === '.'
                        ? cn('bg-slate-200 dark:bg-slate-700/70', sub === 0 && 'bg-slate-300 dark:bg-slate-600')
                        : STEP_FILL[tone][char]
                    )}
                  />
                )
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function Card({ title, hint, action, children }: { title: string; hint: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div role="region" aria-label={title} className="mx-4 mt-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#1a1f36] p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">{hint}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function ResetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
    >
      <RotateCcw className="h-4 w-4" aria-hidden />
    </button>
  )
}

/** Bass or chords: a rhythm of one bar, from a preset or tapped by hand. */
function RhythmCard({
  title,
  laneLabel,
  sustainedHint,
  rhythm,
  presets,
  perBar,
  tone,
  onChange,
}: {
  title: string
  laneLabel: string
  sustainedHint: string
  rhythm: string | undefined
  presets: readonly RhythmPreset[]
  perBar: number
  tone: Tone
  onChange: (rhythm: string | undefined) => void
}) {
  const own = patternHasHits(rhythm)
  const pattern = fitPattern(rhythm, perBar)
  const active = matchingPreset(presets, rhythm, perBar)
  return (
    <Card title={title} hint={own ? 'Ritmo propio de esta canción; las notas salen de los acordes.' : sustainedHint}>
      <div role="radiogroup" aria-label={`Ritmo: ${title.toLowerCase()}`} className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            role="radio"
            aria-checked={active?.id === preset.id}
            onClick={() => onChange(preset.pattern ? fitPattern(preset.pattern, perBar) : undefined)}
            className={chipClass(active?.id === preset.id)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <StepLane label={laneLabel} pattern={pattern} perBar={perBar} tone={tone} onToggle={(index) => onChange(toggleStep(pattern, index))} />
    </Card>
  )
}

export function BandPatternEditor({ band, onChange, beatsPerBar, defaultDrumPattern }: BandPatternEditorProps) {
  const perBar = stepsPerBar(beatsPerBar)
  const update = (changes: Partial<SongBand>) => onChange(cleanSongBand({ ...band, ...changes }))

  // Drums: what is on screen is what sounds — the song's own pattern, or the
  // built-in one until the first tap copies it into the song.
  const ownDrums = !!band?.drums && DRUM_PARTS.some((part) => patternHasHits(band.drums![part]))
  const shown: SongDrumPattern = ownDrums ? cleanDrumPattern(band!.drums) : drumTemplate(defaultDrumPattern)
  const bars = Math.max(1, Math.min(2, Math.ceil(shown.kick.length / perBar)))
  const drums = cleanDrumPattern(shown, bars * perBar)
  const setDrums = (next: SongDrumPattern) => update({ drums: next })
  const setBars = (count: number) => {
    if (count === bars) return
    // Two bars start as the bar repeated; back to one keeps the first.
    const resize = (lane: string) => (count === 2 ? lane.slice(0, perBar) + lane.slice(0, perBar) : lane.slice(0, perBar))
    setDrums({ kick: resize(drums.kick), snare: resize(drums.snare), hat: resize(drums.hat) })
  }

  return (
    <div>
      <Card
        title="Batería"
        hint={
          ownDrums
            ? 'Patrón propio de esta canción.'
            : `Suena el patrón general (${DRUM_PATTERN_LABELS[defaultDrumPattern]}). Toca un paso para escribir el de esta canción.`
        }
        action={ownDrums ? <ResetButton label="Quitar el patrón propio de batería" onClick={() => update({ drums: undefined })} /> : undefined}
      >
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          <span className="shrink-0 text-[11px] font-medium text-slate-600 dark:text-slate-300">Partir de</span>
          {DRUM_PATTERNS.map((pattern) => (
            <button key={pattern} type="button" onClick={() => setDrums(drumTemplate(pattern))} className={chipClass(false)}>
              {DRUM_PATTERN_LABELS[pattern].replace(/ \(.*\)$/, '')}
            </button>
          ))}
        </div>

        <div role="radiogroup" aria-label="Largo del patrón de batería" className="flex gap-1.5">
          {[1, 2].map((count) => (
            <button
              key={count}
              type="button"
              role="radio"
              aria-checked={bars === count}
              onClick={() => setBars(count)}
              className={chipClass(bars === count)}
            >
              {count === 1 ? '1 compás' : '2 compases'}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {DRUM_PARTS.map((part) => (
            <div key={part} className="space-y-1">
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{DRUM_PART_LABELS[part]}</p>
              <StepLane
                label={DRUM_PART_LABELS[part]}
                pattern={drums[part]}
                perBar={perBar}
                tone="rose"
                onToggle={(index) => setDrums({ ...drums, [part]: toggleStep(drums[part], index) })}
              />
            </div>
          ))}
        </div>
      </Card>

      <RhythmCard
        title="Bajo"
        laneLabel="Ritmo del bajo"
        sustainedHint="Una nota larga por acorde. Elige un ritmo o toca los pasos."
        rhythm={band?.bassRhythm}
        presets={BASS_RHYTHM_PRESETS}
        perBar={perBar}
        tone="emerald"
        onChange={(bassRhythm) => update({ bassRhythm })}
      />

      <RhythmCard
        title="Acordes"
        laneLabel="Ritmo de los acordes"
        sustainedHint="Un acorde largo por cambio. Elige un ritmo o toca los pasos."
        rhythm={band?.chordRhythm}
        presets={CHORD_RHYTHM_PRESETS}
        perBar={perBar}
        tone="sky"
        onChange={(chordRhythm) => update({ chordRhythm })}
      />

      <p className="mx-4 mt-3 text-[11px] text-slate-500 dark:text-slate-400">
        Cada casilla es una semicorchea. Un toque: nota; otro: acento; otro más: silencio. Se guarda con la canción.
      </p>
    </div>
  )
}
