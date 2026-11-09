import type { AppSettings } from '~/types/profile'
import {
  SettingsSection,
  SettingsRow,
  SettingsToggle,
  SettingsSlider,
} from './SettingsSection'

export interface MetronomeSettingsProps {
  settings: AppSettings['metronome']
  onUpdate: (updates: Partial<AppSettings['metronome']>) => void
}

const TIME_SIGNATURES = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '12/8'] as const
const SOUNDS = ['classic', 'woodblock', 'sticks', 'electronic', 'silent'] as const

export function MetronomeSettings({ settings, onUpdate }: MetronomeSettingsProps) {
  return (
    <SettingsSection title="Metrónomo" description="Valores con los que arranca el metrónomo">
      <SettingsRow label="BPM inicial" description="Tempo al abrir el metrónomo">
        <SettingsSlider
          value={settings.defaultBpm}
          min={40}
          max={240}
          onChange={(value) => onUpdate({ defaultBpm: value })}
          suffix=" BPM"
        />
      </SettingsRow>

      <SettingsRow label="Compás" description="Compás por defecto">
        <select
          value={settings.defaultTimeSignature}
          onChange={(e) => onUpdate({ defaultTimeSignature: e.target.value })}
          className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#232948] text-slate-900 dark:text-white border-0 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
        >
          {TIME_SIGNATURES.map((sig) => (
            <option key={sig} value={sig}>
              {sig}
            </option>
          ))}
        </select>
      </SettingsRow>

      <SettingsRow label="Sonido del click" description="Timbre del metrónomo">
        <select
          value={settings.sound}
          onChange={(e) =>
            onUpdate({ sound: e.target.value as AppSettings['metronome']['sound'] })
          }
          className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#232948] text-slate-900 dark:text-white border-0 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer capitalize"
        >
          {SOUNDS.map((sound) => (
            <option key={sound} value={sound}>
              {sound.charAt(0).toUpperCase() + sound.slice(1)}
            </option>
          ))}
        </select>
      </SettingsRow>

      <SettingsRow label="Volumen" description="Volumen por defecto">
        <SettingsSlider
          value={settings.volume}
          min={0}
          max={100}
          onChange={(value) => onUpdate({ volume: value })}
          suffix="%"
        />
      </SettingsRow>

      <SettingsRow label="Acentuar el primer tiempo" description="Suena distinto el tiempo 1 de cada compás">
        <SettingsToggle
          checked={settings.accentFirst}
          onChange={(checked) => onUpdate({ accentFirst: checked })}
        />
      </SettingsRow>

      <SettingsRow label="Subdivisiones" description="Añade las corcheas entre tiempos">
        <SettingsToggle
          checked={settings.subdivisions}
          onChange={(checked) => onUpdate({ subdivisions: checked })}
        />
      </SettingsRow>
    </SettingsSection>
  )
}
