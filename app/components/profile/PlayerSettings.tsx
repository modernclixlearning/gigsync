import type { AppSettings } from '~/types/profile'
import {
  SettingsSection,
  SettingsRow,
  SettingsSlider,
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

const SCROLL_BEHAVIORS: AppSettings['player']['scrollBehavior'][] = ['auto', 'manual']

const GRID_RESOLUTION_OPTIONS: { value: number; label: string }[] = [
  { value: 1.0, label: '1/4' },
  { value: 0.5, label: '1/8' },
  { value: 0.25, label: '1/16' },
]

export function PlayerSettings({ settings, onUpdate }: PlayerSettingsProps) {
  const playback = resolvePlaybackPreferences(settings)
  return (
    <SettingsSection
      title="Player"
      icon="▶️"
      description="Lyrics and chord player settings"
    >
      <SettingsRow label="Scroll Behavior" description="How content scrolls during playback">
        <div className="flex gap-2">
          {SCROLL_BEHAVIORS.map((behavior) => (
            <button
              key={behavior}
              onClick={() => onUpdate({ scrollBehavior: behavior })}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium capitalize',
                'transition-colors',
                settings.scrollBehavior === behavior
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-[#232948] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2a3158]'
              )}
            >
              {behavior}
            </button>
          ))}
        </div>
      </SettingsRow>

      <SettingsRow label="Scroll Sensitivity" description="Scroll speed responsiveness">
        <SettingsSlider
          value={settings.scrollSensitivity}
          min={1}
          max={10}
          onChange={(value) => onUpdate({ scrollSensitivity: value })}
        />
      </SettingsRow>

      <SettingsRow label="Default Zoom" description="Starting zoom level">
        <SettingsSlider
          value={settings.defaultZoom}
          min={100}
          max={200}
          step={10}
          onChange={(value) => onUpdate({ defaultZoom: value })}
          suffix="%"
        />
      </SettingsRow>

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
        description="Compases de metrónomo antes de arrancar con Play con precuenta"
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
        description="Al terminar una canción pasa a la siguiente, que arranca con precuenta"
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
