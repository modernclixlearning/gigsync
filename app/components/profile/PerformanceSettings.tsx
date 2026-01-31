import type { AppSettings } from '~/types/profile'
import {
  SettingsSection,
  SettingsRow,
  SettingsToggle,
  SettingsSlider,
} from './SettingsSection'
import { cn } from '~/lib/utils'

export interface PerformanceSettingsProps {
  settings: AppSettings['performance']
  onUpdate: (updates: Partial<AppSettings['performance']>) => void
}

const PERFORMANCE_THEMES: AppSettings['performance']['theme'][] = ['dark', 'extreme-dark']

export function PerformanceSettings({ settings, onUpdate }: PerformanceSettingsProps) {
  return (
    <SettingsSection
      title="Performance Mode"
      icon="🎤"
      description="Stage display settings"
    >
      <SettingsRow label="Theme" description="Performance mode color scheme">
        <div className="flex gap-2">
          {PERFORMANCE_THEMES.map((theme) => (
            <button
              key={theme}
              onClick={() => onUpdate({ theme })}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium',
                'transition-colors',
                settings.theme === theme
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-[#232948] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2a3158]'
              )}
            >
              {theme === 'extreme-dark' ? '⬛ Extreme' : '🌙 Dark'}
            </button>
          ))}
        </div>
      </SettingsRow>

      <SettingsRow label="Font Size" description="Text size during performance">
        <SettingsSlider
          value={settings.fontSize}
          min={100}
          max={200}
          step={10}
          onChange={(value) => onUpdate({ fontSize: value })}
          suffix="%"
        />
      </SettingsRow>

      <SettingsRow label="Auto Scroll Speed" description="Automatic scroll velocity">
        <SettingsSlider
          value={settings.autoScrollSpeed}
          min={1}
          max={10}
          onChange={(value) => onUpdate({ autoScrollSpeed: value })}
        />
      </SettingsRow>

      <SettingsRow label="Show Chords" description="Display chord diagrams">
        <SettingsToggle
          checked={settings.showChords}
          onChange={(checked) => onUpdate({ showChords: checked })}
        />
      </SettingsRow>

      <SettingsRow label="Show Metronome" description="Visual metronome overlay">
        <SettingsToggle
          checked={settings.showMetronome}
          onChange={(checked) => onUpdate({ showMetronome: checked })}
        />
      </SettingsRow>
    </SettingsSection>
  )
}
