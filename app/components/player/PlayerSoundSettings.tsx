import type { ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '~/lib/utils'
import {
  SaveTierButtons,
  SettingsRow,
  SettingsSlider,
  SettingsStepper,
  SettingsToggle,
  type SaveTier,
} from '~/components/profile/SettingsSection'
import {
  AUTO_ADVANCE_DELAY_MAX,
  AUTO_ADVANCE_DELAY_MIN,
  COUNT_IN_BARS_MAX,
  COUNT_IN_BARS_MIN,
} from '~/lib/playback'

/** A titled group of rows inside a player panel tab. */
export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="pt-4 first:pt-0">
      <h4 className="px-4 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{title}</h4>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">{children}</div>
    </section>
  )
}

export interface TransposeControlProps {
  transpose: number
  onTranspose: (semitones: number) => void
  onResetTranspose: () => void
  /** Target key name for the current transpose (e.g. "D#" or "Eb"), already spelled per transposePreferFlats. */
  transposeDisplay: string
  /** Current enharmonic spelling for the transpose target — only meaningful when isTransposeSpellingFlexible. */
  transposePreferFlats: boolean
  /** Whether the current target pitch has both a sharp and a flat name (natural notes don't). */
  isTransposeSpellingFlexible: boolean
  onToggleTransposeSpelling: () => void
  onSaveTranspose: (tier: SaveTier) => void
  canSaveForSetlist: boolean
}

/** Transpose (what you play and read): semitone steps, back to the original key, ♯/♭ spelling. */
export function TransposeControl({
  transpose,
  onTranspose,
  onResetTranspose,
  transposeDisplay,
  transposePreferFlats,
  isTransposeSpellingFlexible,
  onToggleTransposeSpelling,
  onSaveTranspose,
  canSaveForSetlist,
}: TransposeControlProps) {
  return (
    <SettingsRow label="Transponer" description="Los acordes se leen y suenan en el tono nuevo.">
      <div className="flex flex-col items-start gap-1 @md:items-end">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onTranspose(-1)}
            aria-label="Bajar un semitono"
            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onResetTranspose}
            title="Volver al tono original"
            className={cn(
              'w-14 text-center text-sm font-medium rounded-lg py-1',
              transpose !== 0 && 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
            )}
          >
            {transposeDisplay}
          </button>
          <button
            type="button"
            onClick={() => onTranspose(1)}
            aria-label="Subir un semitono"
            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleTransposeSpelling}
            disabled={!isTransposeSpellingFlexible}
            title={isTransposeSpellingFlexible ? 'Cambiar entre sostenido y bemol' : 'Esta nota no tiene alteración alternativa'}
            className={cn(
              'px-2 py-1 rounded-lg text-sm font-medium disabled:opacity-30',
              transposePreferFlats
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                : 'bg-slate-100 dark:bg-slate-800'
            )}
          >
            {transposePreferFlats ? '♭' : '♯'}
          </button>
        </div>
        <SaveTierButtons onSave={onSaveTranspose} canSaveForSetlist={canSaveForSetlist} />
      </div>
    </SettingsRow>
  )
}

interface SoundSource {
  enabled: boolean
  onToggle: () => void
  /** 0–100 */
  volume: number
  onVolumeChange: (volume: number) => void
}

/** On/off switch plus its volume, side by side. */
function SoundSourceRow({ label, description, source }: { label: string; description: string; source: SoundSource }) {
  return (
    <SettingsRow label={label} description={description}>
      <div className="flex items-center gap-3">
        <SettingsToggle checked={source.enabled} onChange={source.onToggle} ariaLabel={label} />
        <SettingsSlider
          value={source.volume}
          min={0}
          max={100}
          step={5}
          onChange={source.onVolumeChange}
          suffix="%"
          ariaLabel={`Volumen: ${label.toLowerCase()}`}
        />
      </div>
    </SettingsRow>
  )
}

export interface PlayerSoundSettingsProps {
  metronome: SoundSource
  chords: SoundSource
  /** Set when the click and the chords can't sound right now, saying why. */
  soundUnavailableReason?: string
  countIn: {
    enabled: boolean
    onToggle: () => void
    bars: number
    onBarsChange: (bars: number) => void
  }
  transpose: TransposeControlProps
  setlist: {
    autoAdvance: boolean
    onAutoAdvanceChange: (autoAdvance: boolean) => void
    delaySeconds: number
    onDelaySecondsChange: (seconds: number) => void
  }
}

/**
 * The «Sonido» tab of the player panel: what plays along with the song (click
 * and chords, each with its volume), the count-in, the key it's played in,
 * and how a setlist moves on.
 */
export function PlayerSoundSettings({
  metronome,
  chords,
  soundUnavailableReason,
  countIn,
  transpose,
  setlist,
}: PlayerSoundSettingsProps) {
  return (
    <div>
      <PanelSection title="Lo que suena">
        {soundUnavailableReason && (
          <p className="mx-4 mt-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            {soundUnavailableReason}
          </p>
        )}
        <SoundSourceRow label="Metrónomo" description="El click y la precuenta." source={metronome} />
        <SoundSourceRow label="Acordes" description="Los acordes de la canción, con un piano simple." source={chords} />
      </PanelSection>

      <PanelSection title="Precuenta">
        <SettingsRow label="Precuenta en cada Play" description="Compases de click antes de arrancar (⏱ en la barra).">
          <div className="flex items-center gap-3">
            <SettingsToggle checked={countIn.enabled} onChange={countIn.onToggle} ariaLabel="Precuenta en cada Play" />
            <SettingsStepper
              value={countIn.bars}
              min={COUNT_IN_BARS_MIN}
              max={COUNT_IN_BARS_MAX}
              onChange={countIn.onBarsChange}
              format={(value) => `${value} ${value === 1 ? 'compás' : 'compases'}`}
            />
          </div>
        </SettingsRow>
      </PanelSection>

      <PanelSection title="Tono">
        <TransposeControl {...transpose} />
      </PanelSection>

      <PanelSection title="Setlist">
        <SettingsRow
          label="Avanzar solo"
          description="Al terminar una canción pasa a la siguiente y la arranca (con precuenta si está activada)."
        >
          <SettingsToggle checked={setlist.autoAdvance} onChange={setlist.onAutoAdvanceChange} ariaLabel="Avanzar solo" />
        </SettingsRow>
        <SettingsRow label="Pausa entre canciones" description="Espera antes de avanzar solo.">
          <SettingsStepper
            value={setlist.delaySeconds}
            min={AUTO_ADVANCE_DELAY_MIN}
            max={AUTO_ADVANCE_DELAY_MAX}
            step={5}
            onChange={setlist.onDelaySecondsChange}
            format={(value) => `${value} s`}
            disabled={!setlist.autoAdvance}
          />
        </SettingsRow>
      </PanelSection>
    </div>
  )
}
