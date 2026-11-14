/**
 * The band's patterns of this song, written step by step: the drum pattern
 * and the rhythm the bass and the chords are played with. The song still sets
 * the tempo, the meter and the chords — here you only say on which 16th notes
 * each part sounds. Everything is saved with the song as you tap.
 */

import { Mic, RotateCcw, Trash2 } from 'lucide-react'
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
import type { BandTake, TakeRole } from '~/lib/audio/bandTracks'

export interface BandPatternEditorProps {
  /** What the song has written so far. */
  band: SongBand | undefined
  /** The whole band after a change; `undefined` when nothing of the song's own is left. */
  onChange: (band: SongBand | undefined) => void
  beatsPerBar: number
  /** The built-in rhythm the drums play while the song has no pattern of its own. */
  defaultDrumPattern: DrumPattern
  /** Open the recorder of a role's live take. Without it, takes are not offered. */
  onEditTake?: (role: TakeRole) => void
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

/**
 * The live take of a role: record one, or — once there is one — choose whether
 * it or the pattern plays, edit it, or delete it.
 */
function TakeRow({
  role,
  name,
  band,
  onChange,
  onEdit,
}: {
  role: TakeRole
  /** The role in a sentence: «la batería». */
  name: string
  band: SongBand | undefined
  onChange: (band: SongBand | undefined) => void
  onEdit: (role: TakeRole) => void
}) {
  const take = band?.takes?.[role]
  const count = take?.notes.length ?? 0
  const setTake = (next: BandTake | undefined) =>
    onChange(cleanSongBand({ ...band, takes: { ...band?.takes, [role]: next } }))
  if (!take || count === 0) {
    return (
      <button
        type="button"
        onClick={() => onEdit(role)}
        className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Mic className="h-4 w-4" aria-hidden />
        Grabar {name} en vivo
      </button>
    )
  }
  const plays = !take.off
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white px-2 py-1.5 dark:bg-slate-800">
      <button
        type="button"
        role="switch"
        aria-checked={plays}
        aria-label={`Suena la toma en vivo: ${name}`}
        onClick={() => setTake({ notes: take.notes, off: plays })}
        className={cn(
          'h-6 w-10 shrink-0 rounded-full p-0.5 transition-colors',
          plays ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
        )}
      >
        <span className={cn('block h-5 w-5 rounded-full bg-white transition-transform', plays && 'translate-x-4')} />
      </button>
      <p className="min-w-0 flex-1 text-[11px] text-slate-700 dark:text-slate-200">
        <span className="font-semibold">Toma en vivo · {count} {count === 1 ? 'nota' : 'notas'}.</span>{' '}
        {plays ? 'Suena en lugar del patrón.' : 'Apagada: suena el patrón.'}
      </p>
      <button
        type="button"
        onClick={() => onEdit(role)}
        className="h-8 shrink-0 rounded-lg bg-slate-100 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
      >
        Editar
      </button>
      <button
        type="button"
        onClick={() => setTake(undefined)}
        aria-label={`Borrar la toma en vivo: ${name}`}
        title="Borrar la toma en vivo"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
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
  footer,
}: {
  footer?: React.ReactNode
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
      {footer}
    </Card>
  )
}

export function BandPatternEditor({ band, onChange, beatsPerBar, defaultDrumPattern, onEditTake }: BandPatternEditorProps) {
  const takeRow = (role: TakeRole, name: string) =>
    onEditTake ? <TakeRow role={role} name={name} band={band} onChange={onChange} onEdit={onEditTake} /> : undefined
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
        {takeRow('drums', 'la batería')}
      </Card>

      <RhythmCard
        title="Bajo"
        footer={takeRow('bass', 'el bajo')}
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
        footer={takeRow('keys', 'los acordes')}
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
