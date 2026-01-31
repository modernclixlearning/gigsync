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
    <SettingsSection title="Metronome" icon="⏱️" description="Default metronome settings">
      <SettingsRow label="Default BPM" description="Starting tempo for metronome">
        <SettingsSlider
          value={settings.defaultBpm}
          min={40}
          max={240}
          onChange={(value) => onUpdate({ defaultBpm: value })}
          suffix=" BPM"
        />
      </SettingsRow>

      <SettingsRow label="Time Signature" description="Default time signature">
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

      <SettingsRow label="Click Sound" description="Metronome sound type">
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

      <SettingsRow label="Volume" description="Default metronome volume">
        <SettingsSlider
          value={settings.volume}
          min={0}
          max={100}
          onChange={(value) => onUpdate({ volume: value })}
          suffix="%"
        />
      </SettingsRow>

      <SettingsRow label="Accent First Beat" description="Emphasize the downbeat">
        <SettingsToggle
          checked={settings.accentFirst}
          onChange={(checked) => onUpdate({ accentFirst: checked })}
        />
      </SettingsRow>

      <SettingsRow label="Subdivisions" description="Add eighth note subdivisions">
        <SettingsToggle
          checked={settings.subdivisions}
          onChange={(checked) => onUpdate({ subdivisions: checked })}
        />
      </SettingsRow>
    </SettingsSection>
  )
}
