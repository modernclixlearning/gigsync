import type { AppSettings } from '~/types/profile'
import {
  SettingsSection,
  SettingsRow,
  SettingsStepper,
  SettingsToggle,
} from './SettingsSection'
import { cn } from '~/lib/utils'
import {
  AUTO_ADVANCE_DELAY_MAX,
  AUTO_ADVANCE_DELAY_MIN,
  COUNT_IN_BARS_MAX,
  COUNT_IN_BARS_MIN,
  resolvePlaybackPreferences,
} from '~/lib/playback'

export interface PlayerSettingsProps {
  settings: AppSettings['player']
  onUpdate: (updates: Partial<AppSettings['player']>) => void
}

const GRID_RESOLUTION_OPTIONS: { value: number; label: string }[] = [
  { value: 1.0, label: '1/4' },
  { value: 0.5, label: '1/8' },
  { value: 0.25, label: '1/16' },
]

export function PlayerSettings({ settings, onUpdate }: PlayerSettingsProps) {
  const playback = resolvePlaybackPreferences(settings)
  return (
    <SettingsSection
      title="Reproductor"
      description="Letra, acordes y avance entre canciones"
    >
      <SettingsRow label="Resolución de grid" description="Unidad mínima para dividir acordes">
        <div className="flex gap-2">
          {GRID_RESOLUTION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ gridResolution: opt.value })}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium',
                'transition-colors',
                settings.gridResolution === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-[#232948] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2a3158]'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </SettingsRow>

      <SettingsRow
        label="Precuenta"
        description="Compases de metrónomo antes de cada Play cuando la precuenta (⏱) está activada"
      >
        <SettingsStepper
          value={playback.countInBars}
          min={COUNT_IN_BARS_MIN}
          max={COUNT_IN_BARS_MAX}
          onChange={(value) => onUpdate({ countInBars: value })}
          format={(value) => `${value} ${value === 1 ? 'compás' : 'compases'}`}
        />
      </SettingsRow>

      <SettingsRow
        label="Avanzar solo en el setlist"
        description="Al terminar una canción pasa a la siguiente y la arranca (con precuenta si está activada)"
      >
        <SettingsToggle
          checked={playback.autoAdvance}
          onChange={(checked) => onUpdate({ autoAdvance: checked })}
        />
      </SettingsRow>

      <SettingsRow label="Pausa entre canciones" description="Espera antes de avanzar solo">
        <SettingsStepper
          value={playback.autoAdvanceDelaySeconds}
          min={AUTO_ADVANCE_DELAY_MIN}
          max={AUTO_ADVANCE_DELAY_MAX}
          step={5}
          onChange={(value) => onUpdate({ autoAdvanceDelaySeconds: value })}
          format={(value) => `${value} s`}
          disabled={!playback.autoAdvance}
        />
      </SettingsRow>
    </SettingsSection>
  )
}
