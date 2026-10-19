import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { cn } from '~/lib/utils'
import { useTuner } from '~/hooks/useTuner'
import { TunerNeedle } from '~/components/tuner/TunerNeedle'
import { PitchDisplay } from '~/components/tuner/PitchDisplay'
import { NoteIndicator } from '~/components/tuner/NoteIndicator'
import { ChromaticDial } from '~/components/tuner/ChromaticDial'
import { TuningPresets } from '~/components/tuner/TuningPresets'
import { CalibrationControl } from '~/components/tuner/CalibrationControl'
import { BottomNav } from '~/components/navigation'

export const Route = createFileRoute('/tuner')({
  component: TunerPage,
})

type ViewMode = 'needle' | 'dial'

function TunerPage() {
  const tuner = useTuner()
  const [showSettings, setShowSettings] = useState(false)
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#101322]">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-slate-50/80 dark:bg-[#101322]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Tuner
          </h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium',
              'transition-colors',
              showSettings
                ? 'bg-primary text-white'
                : 'text-primary hover:bg-primary/10'
            )}
          >
            {showSettings ? 'Done' : 'Settings'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-32">
        {!showSettings ? (
          /* Main Tuner View */
          <div className="flex flex-col items-center py-6 space-y-6">
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
                className="w-full max-w-md p-4 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-sm"
              >
                <p className="font-medium">El afinador necesita el micrófono</p>
                {tuner.error && (
                  <p className="mt-1 text-rose-600 dark:text-rose-400">{tuner.error}</p>
                )}
                <button
                  type="button"
                  onClick={() => void tuner.start()}
                  className="mt-3 w-full px-4 py-3 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30"
                >
                  Activar micrófono
                </button>
              </div>
            ) : null}

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                onClick={() => setViewMode('needle')}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                  viewMode === 'needle'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                )}
              >
                Needle
              </button>
              <button
                onClick={() => setViewMode('dial')}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                  viewMode === 'dial'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                )}
              >
                Dial
              </button>
            </div>

            {/* Visual Display */}
            {viewMode === 'needle' ? (
              <TunerNeedle
                cents={tuner.pitch?.cents ?? 0}
                isActive={tuner.isListening}
                size="lg"
              />
            ) : (
              <ChromaticDial
                activeNote={tuner.pitch?.note ?? null}
                cents={tuner.pitch?.cents ?? null}
                isActive={tuner.isListening}
                size="lg"
              />
            )}

            {/* Pitch Information */}
            <PitchDisplay
              note={tuner.pitch?.note ?? null}
              octave={tuner.pitch?.octave ?? null}
              frequency={tuner.pitch?.frequency ?? null}
              cents={tuner.pitch?.cents ?? null}
              isActive={tuner.isListening}
            />

            {/* Note Indicator */}
            <NoteIndicator
              activeNote={tuner.pitch?.note ?? null}
              targetNote={tuner.preset?.notes[0]?.note ?? null}
              isActive={tuner.isListening}
              className="max-w-md"
            />

            {/* Selected Preset Display */}
            {tuner.preset && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Tuning:
                </span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {tuner.preset.name}
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  ({tuner.preset.notes.map(n => n.note).join(' ')})
                </span>
              </div>
            )}

            {/* Calibration Quick Info */}
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span>A4 = {tuner.calibration.referenceFrequency} Hz</span>
              <span>•</span>
              <span>Sensitivity: {Math.round(tuner.calibration.sensitivity * 100)}%</span>
            </div>
          </div>
        ) : (
          /* Settings View */
          <div className="py-6 space-y-8 max-w-md mx-auto">
            {/* Tuning Presets Section */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Tuning
              </h2>
              <TuningPresets
                selectedPreset={tuner.preset}
                onSelect={tuner.setPreset}
              />
            </section>

            {/* Calibration Section */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Calibration
              </h2>
              <CalibrationControl
                calibration={tuner.calibration}
                onChange={tuner.setCalibration}
              />
            </section>

            {/* About Section */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                About
              </h2>
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  This tuner uses your device's microphone to detect pitch using the YIN algorithm.
                  For best results, tune in a quiet environment and play notes clearly.
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Green</span>
                  {' '}indicates in tune (within ±5 cents).
                </p>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
