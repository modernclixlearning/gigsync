import { cn } from '~/lib/utils'
import type { AppSettings } from '~/types/profile'
import {
  SettingsSection,
  SettingsRow,
  SettingsSelect,
} from './SettingsSection'

export interface AppearanceSettingsProps {
  settings: AppSettings
  onThemeChange: (theme: AppSettings['theme']) => void
  onLanguageChange: (language: AppSettings['language']) => void
}

const THEME_OPTIONS: AppSettings['theme'][] = ['light', 'dark', 'auto']
const LANGUAGE_OPTIONS: { value: AppSettings['language']; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
]

export function AppearanceSettings({
  settings,
  onThemeChange,
  onLanguageChange,
}: AppearanceSettingsProps) {
  return (
    <SettingsSection title="Appearance" icon="🎨">
      <SettingsRow label="Theme" description="Choose your preferred theme">
        <div className="flex gap-2">
          {THEME_OPTIONS.map((theme) => (
            <button
              key={theme}
              onClick={() => onThemeChange(theme)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium capitalize',
                'transition-colors',
                settings.theme === theme
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-[#232948] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2a3158]'
              )}
            >
              {theme === 'auto' ? '🌗 Auto' : theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </button>
          ))}
        </div>
      </SettingsRow>

      <SettingsRow label="Language" description="App display language">
        <select
          value={settings.language}
          onChange={(e) => onLanguageChange(e.target.value as AppSettings['language'])}
          className={cn(
            'px-3 py-2 rounded-lg',
            'bg-slate-100 dark:bg-[#232948]',
            'text-slate-900 dark:text-white',
            'border-0',
            'focus:outline-none focus:ring-2 focus:ring-primary/50',
            'cursor-pointer'
          )}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </SettingsRow>
    </SettingsSection>
  )
}
