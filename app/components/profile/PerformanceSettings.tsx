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
      title="Modo escenario"
      description="Cómo se ve la app en directo"
    >
      <SettingsRow label="Tema" description="Colores del modo escenario">
        <div className="flex gap-2">
          {PERFORMANCE_THEMES.map((theme) => (
            <button
              key={theme}
              onClick={() => onUpdate({ theme })}
              className={cn(
                'h-9 px-3 rounded-lg text-sm font-medium',
                'transition-colors',
                settings.theme === theme
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-[#232948] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2a3158]'
              )}
            >
              {theme === 'extreme-dark' ? 'Negro total' : 'Oscuro'}
            </button>
          ))}
        </div>
      </SettingsRow>

      <SettingsRow label="Tamaño de letra" description="Tamaño del texto en directo">
        <SettingsSlider
          value={settings.fontSize}
          min={100}
          max={200}
          step={10}
          onChange={(value) => onUpdate({ fontSize: value })}
          suffix="%"
        />
      </SettingsRow>

      <SettingsRow label="Velocidad del autoscroll" description="Velocidad del desplazamiento automático">
        <SettingsSlider
          value={settings.autoScrollSpeed}
          min={1}
          max={10}
          onChange={(value) => onUpdate({ autoScrollSpeed: value })}
        />
      </SettingsRow>

      <SettingsRow label="Mostrar acordes" description="Enseña los acordes sobre la letra">
        <SettingsToggle
          checked={settings.showChords}
          onChange={(checked) => onUpdate({ showChords: checked })}
        />
      </SettingsRow>

      <SettingsRow label="Mostrar metrónomo" description="Metrónomo visual sobre la canción">
        <SettingsToggle
          checked={settings.showMetronome}
          onChange={(checked) => onUpdate({ showMetronome: checked })}
        />
      </SettingsRow>
    </SettingsSection>
  )
}
