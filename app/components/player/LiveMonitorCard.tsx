/**
 * «Tocar con el controlador» in the Sonido tab: switch the live monitor on,
 * pick the controller and choose which of the band's roles the keys play.
 * The drum pads (MIDI channel 10) always hit the kit.
 */

import { cn } from '~/lib/utils'
import { SettingsToggle } from '~/components/profile/SettingsSection'
import type { MIDIAccessStatus, MIDIInputInfo } from '~/hooks/useMIDIAccess'
import { MONITOR_ROLES, MONITOR_ROLE_LABELS, type MonitorRole } from '~/lib/midi/liveMonitor'
import { noteName } from '~/lib/midi/pianoRoll'

export interface LiveMonitorCardProps {
  enabled: boolean
  onToggle: () => void
  role: MonitorRole
  onRoleChange: (role: MonitorRole) => void
  accessStatus: MIDIAccessStatus
  inputs: MIDIInputInfo[]
  inputId: string | null
  onInputChange: (inputId: string | null) => void
  /** The sound each role plays with right now (e.g. «Saxo» for the lead). */
  voiceLabels: Record<MonitorRole, string>
  /** Keys held right now. */
  held: number[]
  lastDrum: { part: 'kick' | 'snare' | 'hat'; count: number } | null
}

const DRUM_LABELS = { kick: 'Bombo', snare: 'Caja', hat: 'Hi-hat' } as const

const STATUS_MESSAGE: Partial<Record<MIDIAccessStatus, string>> = {
  unsupported: 'Este navegador no tiene Web MIDI. Usa Chrome o Edge en el ordenador o en Android.',
  denied: 'No hay permiso para usar MIDI. Actívalo en el candado de la barra de direcciones y recarga.',
  requesting: 'Pidiendo acceso a los dispositivos MIDI…',
}

const chipClass = (selected: boolean) =>
  cn(
    'h-9 shrink-0 rounded-full px-3 text-sm font-medium transition-colors',
    selected
      ? 'bg-indigo-600 text-white'
      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
  )

export function LiveMonitorCard({
  enabled,
  onToggle,
  role,
  onRoleChange,
  accessStatus,
  inputs,
  inputId,
  onInputChange,
  voiceLabels,
  held,
  lastDrum,
}: LiveMonitorCardProps) {
  const message =
    STATUS_MESSAGE[accessStatus] ??
    (accessStatus === 'granted' && inputs.length === 0 ? 'No hay ningún controlador MIDI conectado. Enchúfalo por USB; aparece solo.' : null)
  const sounding =
    held.length > 0
      ? held.map(noteName).join(' ')
      : lastDrum
        ? DRUM_LABELS[lastDrum.part]
        : '—'

  return (
    <div
      role="region"
      aria-label="Tocar con el controlador"
      className="mx-4 mt-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#1a1f36] p-3 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Tocar con el controlador</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            Las teclas suenan con el instrumento que elijas; los pads (canal 10) siempre con la batería.
          </p>
        </div>
        <SettingsToggle checked={enabled} onChange={onToggle} ariaLabel="Tocar con el controlador" />
      </div>

      {enabled && (
        <>
          {message && (
            <p role={accessStatus === 'requesting' ? 'status' : 'alert'} className="text-xs text-slate-600 dark:text-slate-300">
              {message}
            </p>
          )}

          <div role="radiogroup" aria-label="Instrumento de las teclas" className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {MONITOR_ROLES.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={role === option}
                onClick={() => onRoleChange(option)}
                className={chipClass(role === option)}
              >
                {MONITOR_ROLE_LABELS[option]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {inputs.length > 0 && (
              <select
                aria-label="Controlador MIDI"
                value={inputId ?? ''}
                onChange={(event) => onInputChange(event.target.value || null)}
                className="h-9 min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                {inputs.map((input) => (
                  <option key={input.id} value={input.id}>
                    {input.name}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Suena: <span className="font-medium text-slate-900 dark:text-white">{voiceLabels[role]}</span>
            </p>
            <p aria-live="off" className="ml-auto text-xs tabular-nums text-slate-600 dark:text-slate-300">
              <span className="sr-only">Lo que tocas: </span>
              <span key={lastDrum?.count} data-testid="live-monitor-sounding" className="font-semibold text-slate-900 dark:text-white">
                {sounding}
              </span>
            </p>
          </div>
        </>
      )}
    </div>
  )
}
