import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '~/lib/utils'
import { useMetronome } from '~/hooks/useMetronome'
import { MetronomeDisplay } from '~/components/metronome/MetronomeDisplay'
import { BPMControl } from '~/components/metronome/BPMControl'
import { TimeSignatureSelector } from '~/components/metronome/TimeSignatureSelector'
import { SoundSelector } from '~/components/metronome/SoundSelector'
import { TapTempo } from '~/components/metronome/TapTempo'
import { BottomNav } from '~/components/navigation'
import type { MetronomeSound } from '~/components/metronome/SoundSelector'

export const Route = createFileRoute('/metronome')({
  component: MetronomePage,
})

function MetronomePage() {
  const metronome = useMetronome(120)
  const [showSettings, setShowSettings] = useState(false)

  const handleBpmChange = (bpm: number) => {
    metronome.setBpm(bpm)
  }

  const handleTimeSignatureChange = (signature: string) => {
    metronome.setTimeSignature(signature)
    // Restart metronome if playing to apply new time signature
    if (metronome.isPlaying) {
      metronome.stop()
      metronome.start()
    }
  }

  const handleSoundChange = (sound: MetronomeSound) => {
    metronome.setSound(sound)
  }

  const handleTapBpmDetected = (bpm: number) => {
    metronome.setBpm(bpm)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#101322]">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-slate-50/80 dark:bg-[#101322]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Metronome
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

      {/* Error Message */}
      {metronome.error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mx-4 mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
        >
          <div className="flex items-start gap-3">
            <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                Error de audio
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {metronome.error}
              </p>
            </div>
            <button
              onClick={() => {
                // Clear error by attempting to start again
                if (!metronome.isPlaying) {
                  metronome.start()
                }
              }}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 text-sm font-medium"
            >
              Reintentar
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <main className="px-4 pb-32">
        {!showSettings ? (
          /* Main Metronome View */
          <div className="flex flex-col items-center py-8 space-y-8">
            {/* Display */}
            <MetronomeDisplay
              bpm={metronome.bpm}
              currentBeat={metronome.currentBeat}
              timeSignature={metronome.timeSignature}
              isPlaying={metronome.isPlaying}
            />

            {/* BPM Control */}
            <BPMControl
              value={metronome.bpm}
              onChange={handleBpmChange}
              size="xl"
              showGlow
            />

            {/* Tap Tempo */}
            <TapTempo onBpmDetected={handleTapBpmDetected} />

            {/* Quick Settings */}
            <div className="w-full max-w-md space-y-6">
              <TimeSignatureSelector
                value={metronome.timeSignature}
                onChange={handleTimeSignatureChange}
              />
            </div>
          </div>
        ) : (
          /* Settings View */
          <div className="py-6 space-y-8 max-w-md mx-auto">
            {/* Sound Selection */}
            <SoundSelector
              value={metronome.sound}
              onChange={handleSoundChange}
            />

            {/* Volume Control */}
            <div className="w-full">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Volume
              </h3>
              <div className="flex items-center gap-4">
                <span className="text-slate-400">🔈</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={metronome.volume * 100}
                  onChange={(e) => metronome.setVolume(Number(e.target.value) / 100)}
                  className={cn(
                    'flex-1 h-2 rounded-full appearance-none cursor-pointer',
                    'bg-slate-200 dark:bg-[#232948]',
                    '[&::-webkit-slider-thumb]:appearance-none',
                    '[&::-webkit-slider-thumb]:w-5',
                    '[&::-webkit-slider-thumb]:h-5',
                    '[&::-webkit-slider-thumb]:rounded-full',
                    '[&::-webkit-slider-thumb]:bg-primary',
                    '[&::-webkit-slider-thumb]:shadow-lg',
                    '[&::-webkit-slider-thumb]:shadow-primary/30'
                  )}
                />
                <span className="text-slate-400">🔊</span>
              </div>
              <div className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                {Math.round(metronome.volume * 100)}%
              </div>
            </div>

            {/* Accent First Beat */}
            <div className="w-full">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#111218] border border-slate-200 dark:border-[#3b3f54]">
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white">
                    Accent First Beat
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Emphasize the downbeat
                  </p>
                </div>
                <button
                  onClick={() => metronome.setAccentFirst(!metronome.accentFirst)}
                  className={cn(
                    'relative w-12 h-7 rounded-full transition-colors',
                    metronome.accentFirst
                      ? 'bg-primary'
                      : 'bg-slate-200 dark:bg-[#232948]'
                  )}
                  role="switch"
                  aria-checked={metronome.accentFirst}
                >
                  <motion.div
                    className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
                    animate={{
                      left: metronome.accentFirst ? 'calc(100% - 24px)' : '4px',
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </div>

            {/* Subdivisions */}
            <div className="w-full">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#111218] border border-slate-200 dark:border-[#3b3f54]">
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white">
                    Subdivisions
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Add eighth note subdivisions
                  </p>
                </div>
                <button
                  onClick={metronome.toggleSubdivisions}
                  className={cn(
                    'relative w-12 h-7 rounded-full transition-colors',
                    metronome.subdivisions
                      ? 'bg-primary'
                      : 'bg-slate-200 dark:bg-[#232948]'
                  )}
                  role="switch"
                  aria-checked={metronome.subdivisions}
                >
                  <motion.div
                    className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
                    animate={{
                      left: metronome.subdivisions ? 'calc(100% - 24px)' : '4px',
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Play/Pause FAB */}
      <div className="fixed bottom-24 left-0 right-0 flex justify-center z-30">
        <motion.button
          onClick={metronome.toggle}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'flex items-center justify-center',
            'w-16 h-16 rounded-full',
            'bg-primary text-white',
            'shadow-xl shadow-primary/40',
            'active:bg-primary-dark',
            'transition-colors'
          )}
          aria-label={metronome.isPlaying ? 'Stop metronome' : 'Start metronome'}
        >
          {metronome.isPlaying ? (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </motion.button>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
