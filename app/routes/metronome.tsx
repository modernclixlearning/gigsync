import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Pause, Play } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useMetronome } from '~/hooks/useMetronome'
import { VisualBeat } from '~/components/metronome/VisualBeat'
import { BPMControl } from '~/components/metronome/BPMControl'
import { TimeSignatureSelector } from '~/components/metronome/TimeSignatureSelector'
import { SoundSelector } from '~/components/metronome/SoundSelector'
import { TapTempo } from '~/components/metronome/TapTempo'
import { Page, ErrorBanner, cardClass } from '~/components/layout'
import { SettingsSection, SettingsRow, SettingsSlider, SettingsToggle } from '~/components/profile/SettingsSection'
import type { MetronomeSound } from '~/components/metronome/SoundSelector'

export const Route = createFileRoute('/metronome')({
  component: MetronomePage,
})

function MetronomePage() {
  const metronome = useMetronome(120)

  const handleTimeSignatureChange = (signature: string) => {
    metronome.setTimeSignature(signature)
    // Restart metronome if playing to apply new time signature
    if (metronome.isPlaying) {
      metronome.stop()
      metronome.start()
    }
  }

  const beatsPerMeasure = Number(metronome.timeSignature.split('/')[0]) || 4

  return (
    <Page title="Metrónomo" subtitle="Marca el tempo y practica a click">
      {metronome.error && (
        <ErrorBanner
          title="Error de audio"
          message={metronome.error}
          action={
            <button
              type="button"
              onClick={() => {
                if (!metronome.isPlaying) metronome.start()
              }}
              className="text-sm font-semibold text-red-700 dark:text-red-300"
            >
              Reintentar
            </button>
          }
        />
      )}

      {/* Phone/tablet: the instrument, then its settings below.
          Desktop: instrument on the left, settings always in view on the right. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section
          aria-label="Metrónomo"
          className={cn(cardClass, 'flex flex-col items-center gap-6 px-4 py-6 sm:py-8')}
        >
          <VisualBeat
            count={beatsPerMeasure}
            activeIndex={metronome.currentBeat}
            isPlaying={metronome.isPlaying}
            variant="circles"
            glow
          />

          <BPMControl
            value={metronome.bpm}
            onChange={metronome.setBpm}
            size="xl"
            showGlow
          />

          {/* Transport: play in the middle, tap tempo next to it */}
          <div className="flex w-full max-w-sm items-center justify-center gap-4">
            <motion.button
              type="button"
              onClick={metronome.toggle}
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
            <TapTempo onBpmDetected={metronome.setBpm} />
          </div>

          <TimeSignatureSelector
            value={metronome.timeSignature}
            onChange={handleTimeSignatureChange}
            className="max-w-sm"
          />
        </section>

        <div className="space-y-6">
          <SoundSelector
            value={metronome.sound}
            onChange={(sound: MetronomeSound) => metronome.setSound(sound)}
          />

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
        </div>
      </div>
    </Page>
  )
}
