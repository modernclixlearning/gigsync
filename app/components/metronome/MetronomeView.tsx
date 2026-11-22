/**
 * The metronome itself — beat lights, the tempo knob, start/stop, meter, sound
 * and settings — as one piece, so the Metrónomo page and the one inside the
 * song player are the same metronome.
 *
 *  - `page`: the instrument on the left, its settings always in view on the
 *    right on a wide screen.
 *  - `dialog`: one column that fits a modal; sound and settings are folded away.
 *
 * It runs on its own clock (see useMetronome), not on the song's transport, so
 * it can be used over a song without moving it.
 */

import { motion } from 'framer-motion'
import { Check, Pause, Play, RotateCcw } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useMetronome } from '~/hooks/useMetronome'
import { VisualBeat } from '~/components/metronome/VisualBeat'
import { TempoKnob } from '~/components/metronome/TempoKnob'
import { TimeSignatureSelector } from '~/components/metronome/TimeSignatureSelector'
import { SoundSelector, type MetronomeSound } from '~/components/metronome/SoundSelector'
import { ErrorBanner, cardClass } from '~/components/layout'
import { SettingsSection, SettingsRow, SettingsSlider, SettingsToggle } from '~/components/profile/SettingsSection'

export interface MetronomeViewProps {
  layout?: 'page' | 'dialog'
  /** Tempo to start at (the song's, in the player). Default 120. */
  initialBpm?: number
  /** Meter to start at (the song's, in the player). Default 4/4. */
  initialTimeSignature?: string
  /** The tempo the song has saved (the player). Default: the one the view opened at. */
  songBpm?: number
  /** Save the tempo shown as the song's own. Without it there is no such button. */
  onApplyBpm?: (bpm: number) => void
}

export function MetronomeView({ layout = 'page', initialBpm = 120, initialTimeSignature = '4/4', songBpm, onApplyBpm }: MetronomeViewProps) {
  // The tempo it opened at: whole and in range (a DAW's clock gives decimals).
  const startedAt = Math.max(20, Math.min(300, Math.round(initialBpm)))
  // The tempo the song has saved, to say it and to know when what you marked differs from it.
  const songTempo = Math.max(20, Math.min(300, Math.round(songBpm ?? initialBpm)))
  const metronome = useMetronome(startedAt, initialTimeSignature)
  const inDialog = layout === 'dialog'
  const beatsPerMeasure = Number(metronome.timeSignature.split('/')[0]) || 4

  const settings = (
    <>
      <SoundSelector value={metronome.sound} onChange={(sound: MetronomeSound) => metronome.setSound(sound)} />

      <SettingsSection title="Ajustes">
        <SettingsRow label="Volumen">
          <SettingsSlider
            value={Math.round(metronome.volume * 100)}
            min={0}
            max={100}
            onChange={(value) => metronome.setVolume(value / 100)}
            suffix="%"
            ariaLabel="Volumen"
          />
        </SettingsRow>
        <SettingsRow label="Acentuar el primer tiempo" description="Suena distinto el tiempo 1 de cada compás">
          <SettingsToggle
            checked={metronome.accentFirst}
            onChange={(checked) => metronome.setAccentFirst(checked)}
            ariaLabel="Acentuar el primer tiempo"
          />
        </SettingsRow>
        <SettingsRow label="Subdivisiones" description="Añade las corcheas entre tiempos">
          <SettingsToggle
            checked={metronome.subdivisions}
            onChange={() => metronome.toggleSubdivisions()}
            ariaLabel="Subdivisiones"
          />
        </SettingsRow>
      </SettingsSection>
    </>
  )

  return (
    <>
      {metronome.error && (
        <ErrorBanner
          title="Error de audio"
          message={metronome.error}
          action={
            <button
              type="button"
              onClick={() => {
                if (!metronome.isPlaying) void metronome.start()
              }}
              className="text-sm font-semibold text-red-700 dark:text-red-300"
            >
              Reintentar
            </button>
          }
        />
      )}

      <div className={cn('grid gap-6', !inDialog && 'lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start')}>
        <section
          aria-label="Metrónomo"
          className={cn('flex flex-col items-center gap-6', inDialog ? 'py-1' : cn(cardClass, 'px-4 py-6 sm:py-8'))}
        >
          <VisualBeat
            count={beatsPerMeasure}
            activeIndex={metronome.currentBeat}
            isPlaying={metronome.isPlaying}
            variant="circles"
            glow
          />

          <TempoKnob value={metronome.bpm} onChange={metronome.setBpm} isPlaying={metronome.isPlaying} size="md" />
          <p className="-mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
            Gira el anillo para cambiar el tempo · toca el centro al ritmo para marcarlo
          </p>

          <div className="flex w-full max-w-sm items-center justify-center gap-3">
            <motion.button
              type="button"
              onClick={() => void metronome.toggle()}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex h-14 flex-1 items-center justify-center gap-2 rounded-full',
                'bg-primary text-white text-base font-semibold',
                'shadow-lg shadow-primary/30 hover:bg-primary-dark transition-colors'
              )}
              aria-label={metronome.isPlaying ? 'Detener metrónomo' : 'Iniciar metrónomo'}
            >
              {metronome.isPlaying ? (
                <>
                  <Pause className="h-5 w-5 fill-current" /> Detener
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 fill-current" /> Iniciar
                </>
              )}
            </motion.button>
            {inDialog && metronome.bpm !== startedAt && (
              <button
                type="button"
                onClick={() => metronome.setBpm(startedAt)}
                title="Volver al tempo con el que se abrió"
                className="flex h-14 shrink-0 items-center gap-1.5 rounded-full bg-slate-200/70 px-4 text-sm font-semibold text-slate-900 hover:bg-slate-200 dark:bg-[#232948] dark:text-white dark:hover:bg-[#2d3454]"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                {startedAt}
              </button>
            )}
          </div>

          {onApplyBpm && (
            <div className="flex w-full max-w-sm flex-col items-center gap-2">
              <p aria-live="polite" className="text-sm text-slate-500 dark:text-slate-400">
                Tempo de la canción: <span className="font-semibold text-slate-900 dark:text-white">{songTempo} BPM</span>
              </p>
              {metronome.bpm !== songTempo && (
                <button
                  type="button"
                  onClick={() => onApplyBpm(metronome.bpm)}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  <Check className="h-4 w-4" aria-hidden />
                  Usar {metronome.bpm} BPM en la canción
                </button>
              )}
            </div>
          )}

          <TimeSignatureSelector value={metronome.timeSignature} onChange={metronome.setTimeSignature} className="max-w-sm" />
        </section>

        {inDialog ? (
          <details className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
            <summary className="cursor-pointer select-none text-sm font-medium text-slate-700 dark:text-slate-300">
              Sonido y ajustes
            </summary>
            <div className="space-y-6 pt-3">{settings}</div>
          </details>
        ) : (
          <div className="space-y-6">{settings}</div>
        )}
      </div>
    </>
  )
}
