import type { AppSettings } from '~/types/profile'
import {
  SettingsSection,
  SettingsRow,
  SettingsSlider,
} from './SettingsSection'
import { cn } from '~/lib/utils'

export interface PlayerSettingsProps {
  settings: AppSettings['player']
  onUpdate: (updates: Partial<AppSettings['player']>) => void
}

const SCROLL_BEHAVIORS: AppSettings['player']['scrollBehavior'][] = ['auto', 'manual']

export function PlayerSettings({ settings, onUpdate }: PlayerSettingsProps) {
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
    </SettingsSection>
  )
}
