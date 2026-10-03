import type { MidiClockSyncPreferences } from '~/types/profile'
import { useMIDIClockSync } from '~/hooks/useMIDIClockSync'
import {
  SettingsSection,
  SettingsRow,
  SettingsToggle,
  SettingsSelect,
} from './SettingsSection'

export interface MidiClockSyncSettingsProps {
  settings: MidiClockSyncPreferences
  onUpdate: (updates: Partial<MidiClockSyncPreferences>) => void
}

const AUTO_INPUT_LABEL = 'Automático (primer puerto)'
const SETUP_GUIDE_URL =
  'https://github.com/modernclixlearning/gigsync/blob/master/docs/midi-clock-sync.md'

export function MidiClockSyncSettings({ settings, onUpdate }: MidiClockSyncSettingsProps) {
  // Only lists ports (and shows the live tempo as a connection check) while
  // the sync is on — turning it on is what triggers the browser's MIDI prompt.
  const midi = useMIDIClockSync({
    enabled: settings.enabled,
    inputName: settings.inputName,
  })

  const inputNames = midi.inputs.map((input) => input.name)
  // Keep a saved-but-disconnected port visible so the user sees what's selected.
  if (settings.inputName && !inputNames.includes(settings.inputName)) {
    inputNames.push(settings.inputName)
  }
  const inputOptions = [AUTO_INPUT_LABEL, ...inputNames]

  let statusText: string
  if (midi.status === 'listening') {
    statusText =
      midi.bpm !== null
        ? `Recibiendo clock de "${midi.activeInputName}": ${midi.bpm.toFixed(1)} BPM`
        : `Escuchando "${midi.activeInputName}". Dale play en el DAW para recibir el clock.`
  } else if (midi.status === 'requesting') {
    statusText = 'Pidiendo acceso a MIDI…'
  } else {
    statusText = midi.message ?? ''
  }

  return (
    <SettingsSection
      title="Sync con DAW (MIDI Clock)"
      icon="🎛️"
      description="Seguir el tempo y el play/stop de REAPER o Ableton Live (Chrome/Edge)"
    >
      <SettingsRow
        label="Seguir MIDI Clock"
        description="El reproductor toma el BPM y el Start/Stop del DAW. Apagado: usa el BPM de cada canción."
      >
        <SettingsToggle
          checked={settings.enabled}
          onChange={(checked) => onUpdate({ enabled: checked })}
        />
      </SettingsRow>

      {settings.enabled && (
        <>
          <SettingsRow label="Puerto MIDI de entrada" description={statusText}>
            <SettingsSelect
              value={settings.inputName ?? AUTO_INPUT_LABEL}
              options={inputOptions}
              onChange={(value) =>
                onUpdate({ inputName: value === AUTO_INPUT_LABEL ? null : value })
              }
              disabled={midi.inputs.length === 0 && !settings.inputName}
            />
          </SettingsRow>

          <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
            En Windows necesitás un puerto MIDI virtual (loopMIDI) y activar el envío de clock
            en el DAW.{' '}
            <a
              href={SETUP_GUIDE_URL}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Ver guía de configuración
            </a>
          </div>
        </>
      )}
    </SettingsSection>
  )
}
