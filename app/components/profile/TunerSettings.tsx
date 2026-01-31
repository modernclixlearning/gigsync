import type { AppSettings } from '~/types/profile'
import { TUNINGS } from '~/types/profile'
import {
  SettingsSection,
  SettingsRow,
  SettingsToggle,
  SettingsSlider,
} from './SettingsSection'

export interface TunerSettingsProps {
  settings: AppSettings['tuner']
  onUpdate: (updates: Partial<AppSettings['tuner']>) => void
}

export function TunerSettings({ settings, onUpdate }: TunerSettingsProps) {
  return (
    <SettingsSection title="Tuner" icon="🎸" description="Instrument tuner settings">
      <SettingsRow
        label="A4 Calibration"
        description="Reference pitch frequency (standard: 440 Hz)"
      >
        <SettingsSlider
          value={settings.calibration}
          min={430}
          max={450}
          onChange={(value) => onUpdate({ calibration: value })}
          suffix=" Hz"
        />
      </SettingsRow>

      <SettingsRow label="Default Tuning" description="Starting tuning preset">
        <select
          value={settings.defaultTuning}
          onChange={(e) => onUpdate({ defaultTuning: e.target.value })}
          className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#232948] text-slate-900 dark:text-white border-0 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
        >
          {TUNINGS.map((tuning) => (
            <option key={tuning} value={tuning}>
              {tuning}
            </option>
          ))}
        </select>
      </SettingsRow>

      <SettingsRow label="Show Frequency" description="Display Hz value while tuning">
        <SettingsToggle
          checked={settings.showFrequency}
          onChange={(checked) => onUpdate({ showFrequency: checked })}
        />
      </SettingsRow>
    </SettingsSection>
  )
}
