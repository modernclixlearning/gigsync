import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Mic } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useTuner } from '~/hooks/useTuner'
import { TunerNeedle } from '~/components/tuner/TunerNeedle'
import { PitchDisplay } from '~/components/tuner/PitchDisplay'
import { NoteIndicator } from '~/components/tuner/NoteIndicator'
import { ChromaticDial } from '~/components/tuner/ChromaticDial'
import { TuningPresets } from '~/components/tuner/TuningPresets'
import { CalibrationControl } from '~/components/tuner/CalibrationControl'
import { Page, SectionTitle, buttonClass, cardClass } from '~/components/layout'

export const Route = createFileRoute('/tuner')({
  component: TunerPage,
})

type ViewMode = 'needle' | 'dial'

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: 'needle', label: 'Aguja' },
  { id: 'dial', label: 'Rueda' },
]

function TunerPage() {
  const tuner = useTuner()
  const [viewMode, setViewMode] = useState<ViewMode>('needle')

  // Opening the tuner already means you want the mic: start listening
  // without a Start button, and again when the app comes back to the front.
  // The mic is released when you leave the page (useMicrophone's unmount).
  const [hasTriedStart, setHasTriedStart] = useState(false)
  const startRef = useRef(tuner.start)
  startRef.current = tuner.start
  useEffect(() => {
    const startListening = () => {
      void startRef.current().finally(() => setHasTriedStart(true))
    }
    startListening()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') startListening()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const needsAction = !tuner.isListening && !tuner.isRequesting && (hasTriedStart || !!tuner.error)

  return (
    <Page
      title="Afinador"
      subtitle="Cromático, con el micrófono del dispositivo"
      actions={
        <div
          role="group"
          aria-label="Vista del afinador"
          className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl"
        >
          {VIEW_MODES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={viewMode === id}
              onClick={() => setViewMode(id)}
              className={cn(
                'h-9 px-3 rounded-lg text-sm font-medium transition-colors',
                viewMode === id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      {/* Phone/tablet: the tuner, then its settings below.
          Desktop: tuner on the left, settings always in view on the right. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section
          aria-label="Afinador"
          className={cn(cardClass, 'flex flex-col items-center gap-6 px-4 py-6 sm:py-8')}
        >
          {/* Mic status: listening, asking, or what to do to get it going */}
          {tuner.isListening ? (
            <p
              role="status"
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              Escuchando
            </p>
          ) : tuner.isRequesting ? (
            <p role="status" className="text-sm text-slate-500 dark:text-slate-400">
              Activando el micrófono…
            </p>
          ) : needsAction ? (
            <div
              role="alert"
              className="w-full max-w-md rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm"
            >
              <p className="font-semibold text-amber-900 dark:text-amber-100">El afinador necesita el micrófono</p>
              {tuner.error && (
                <p className="mt-1 text-amber-800 dark:text-amber-300">{tuner.error}</p>
              )}
              <button
                type="button"
                onClick={() => void tuner.start()}
                className={buttonClass('primary', 'mt-3 w-full')}
              >
                <Mic className="h-4 w-4" />
                Activar micrófono
              </button>
            </div>
          ) : null}

          {viewMode === 'needle' ? (
            <TunerNeedle
              cents={tuner.pitch?.cents ?? 0}
              isActive={tuner.isListening}
              size="md"
            />
          ) : (
            <ChromaticDial
              activeNote={tuner.pitch?.note ?? null}
              cents={tuner.pitch?.cents ?? null}
              isActive={tuner.isListening}
              size="md"
            />
          )}

          <PitchDisplay
            note={tuner.pitch?.note ?? null}
            octave={tuner.pitch?.octave ?? null}
            frequency={tuner.pitch?.frequency ?? null}
            cents={tuner.pitch?.cents ?? null}
            isActive={tuner.isListening}
          />

          <NoteIndicator
            activeNote={tuner.pitch?.note ?? null}
            targetNote={tuner.preset?.notes[0]?.note ?? null}
            isActive={tuner.isListening}
            className="max-w-md"
          />

          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
            {tuner.preset && (
              <>
                <span>
                  <span className="font-medium text-slate-900 dark:text-white">{tuner.preset.name}</span>{' '}
                  <span className="font-mono text-xs">({tuner.preset.notes.map((n) => n.note).join(' ')})</span>
                </span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>A4 = {tuner.calibration.referenceFrequency} Hz</span>
            <span aria-hidden="true">·</span>
            <span>Sensibilidad {Math.round(tuner.calibration.sensitivity * 100)}%</span>
          </p>
        </section>

        <div className="space-y-6">
          <section className="space-y-3">
            <SectionTitle className="px-1">Afinación</SectionTitle>
            <TuningPresets
              selectedPreset={tuner.preset}
              onSelect={tuner.setPreset}
            />
          </section>

          <section className="space-y-3">
            <SectionTitle className="px-1">Calibración</SectionTitle>
            <CalibrationControl
              calibration={tuner.calibration}
              onChange={tuner.setCalibration}
            />
          </section>

          <p className="px-1 text-sm text-slate-500 dark:text-slate-400">
            Afina en un lugar tranquilo y toca las notas con claridad.{' '}
            <span className="font-medium text-emerald-600 dark:text-emerald-400">Verde</span> significa afinado (±5 cents).
          </p>
        </div>
      </div>
    </Page>
  )
}
