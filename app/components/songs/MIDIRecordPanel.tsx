import { useEffect, useState } from 'react'
import { Circle, Piano, Square, X } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useMIDIAccess, type MIDIInputInfo } from '~/hooks/useMIDIAccess'
import { useMIDIRecorder } from '~/hooks/useMIDIRecorder'
import {
  beatsPerBarFromTimeSignature,
  buildDetectedSection,
  parseBarText,
  progressionToBarLines,
} from '~/lib/audioAnalysis/chordproOutput'
import type { AudioAnalysisApply } from './AudioAnalysisPanel'
import { SONG_KEYS } from './SongForm'

export const RECORDED_SECTION_NAME = 'Grabación'

interface MIDIRecordPanelProps {
  timeSignature: string
  currentBpm: number
  currentKey?: string
  onApply: (changes: AudioAnalysisApply) => void
  onClose: () => void
}

const inputClass = cn(
  'w-full px-4 py-3 rounded-xl',
  'bg-white dark:bg-[#1a1f36]',
  'border border-slate-200 dark:border-slate-700',
  'text-slate-900 dark:text-white',
  'placeholder:text-slate-400',
  'focus:outline-none focus:ring-2 focus:ring-indigo-500',
)

const clampBpm = (n: number) => Math.min(300, Math.max(20, Math.round(n)))

/** Virtual/DAW ports and controller-only ports (MiniLab's DIN THRU, MCU/HUI, ALV…). */
const NON_KEYBOARD_PORT = /loopmidi|thru|mcu|hui|alv|daw|clock/i

/** The keyboard to preselect: the first port that doesn't look like a DAW/control port. */
export function defaultKeyboardInput(inputs: MIDIInputInfo[]): MIDIInputInfo | null {
  return inputs.find((input) => !NON_KEYBOARD_PORT.test(input.name)) ?? inputs[0] ?? null
}

/** Section names end up inside `[Name | N bars]`: no brackets or bar separators. */
function cleanSectionName(name: string): string {
  return name.replace(/[[\]|]/g, ' ').replace(/\s+/g, ' ').trim() || RECORDED_SECTION_NAME
}

const ACCESS_MESSAGE = {
  unsupported: 'Este navegador no tiene Web MIDI. Usá Chrome o Edge en la compu.',
  denied: 'No hay permiso para usar MIDI. Habilitalo en el candado de la barra de direcciones y recargá.',
  requesting: 'Pidiendo acceso a los dispositivos MIDI…',
} as const

/**
 * Record the chords played on a MIDI keyboard against a click (count-in +
 * metronome at the song's tempo), review them as bar lines and append them to
 * the song as their own section, ready for adding the lyrics.
 */
export function MIDIRecordPanel({ timeSignature, currentBpm, currentKey, onApply, onClose }: MIDIRecordPanelProps) {
  const beatsPerBar = beatsPerBarFromTimeSignature(timeSignature)
  const { access, accessStatus, inputs } = useMIDIAccess(true)
  const [inputId, setInputId] = useState<string | null>(null)
  const [bpm, setBpm] = useState(clampBpm(currentBpm))
  const [songKey, setSongKey] = useState(currentKey || 'C')
  const [countInBars, setCountInBars] = useState(1)
  const [monitor, setMonitor] = useState(true)

  const [barText, setBarText] = useState('')
  const [sectionName, setSectionName] = useState(RECORDED_SECTION_NAME)

  // Keep a valid selection as keyboards are plugged/unplugged.
  useEffect(() => {
    if (inputId && inputs.some((input) => input.id === inputId)) return
    setInputId(defaultKeyboardInput(inputs)?.id ?? null)
  }, [inputs, inputId])

  const recorder = useMIDIRecorder({ access, inputId, bpm, beatsPerBar, countInBars, monitor })
  const { phase, recording } = recorder
  const busy = phase === 'count-in' || phase === 'recording'

  useEffect(() => {
    if (recording) setBarText(progressionToBarLines(recording.progression).join('\n'))
  }, [recording])

  const parsedBars = parseBarText(barText, beatsPerBar)
  const chordsInvalid = parsedBars.invalidLines.length > 0 || parsedBars.lines.length === 0
  const bpmChanged = bpm !== currentBpm
  const keyChanged = songKey !== currentKey

  const handleApply = () => {
    if (chordsInvalid) return
    onApply({
      bpm: bpmChanged ? bpm : undefined,
      key: keyChanged ? songKey : undefined,
      section: buildDetectedSection(parsedBars.lines, parsedBars.barCount, cleanSectionName(sectionName)),
    })
  }

  const accessMessage =
    accessStatus === 'unsupported' || accessStatus === 'denied' || accessStatus === 'requesting'
      ? ACCESS_MESSAGE[accessStatus]
      : accessStatus === 'granted' && inputs.length === 0
        ? 'No hay ningún dispositivo MIDI conectado. Enchufá el teclado por USB; aparece solo.'
        : null

  return (
    <section
      aria-label="Grabar acordes desde teclado MIDI"
      className="mb-4 p-4 rounded-xl bg-white dark:bg-[#1a1f36] border border-slate-200 dark:border-slate-700 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Piano className="w-4 h-4 text-indigo-500" />
            Grabar acordes desde teclado MIDI
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tocá los acordes con el click. Al parar, la progresión queda como sección de la canción para
            después sumarle la letra. Los pads (canal 10) se ignoran.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            recorder.reset()
            onClose()
          }}
          aria-label="Cerrar"
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {accessMessage && (
        <p role={accessStatus === 'requesting' ? 'status' : 'alert'} className="text-sm text-slate-600 dark:text-slate-300">
          {accessMessage}
        </p>
      )}

      {inputs.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 text-sm text-slate-700 dark:text-slate-300">
            <span className="block mb-1 font-medium">Teclado</span>
            <select
              aria-label="Entrada MIDI"
              value={inputId ?? ''}
              disabled={busy}
              onChange={(e) => setInputId(e.target.value || null)}
              className={inputClass}
            >
              {inputs.map((input) => (
                <option key={input.id} value={input.id}>
                  {input.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-300">
            <span className="block mb-1 font-medium">BPM</span>
            <input
              type="number"
              aria-label="BPM de la grabación"
              value={bpm}
              min={20}
              max={300}
              disabled={busy}
              onChange={(e) => setBpm(clampBpm(parseInt(e.target.value) || bpm))}
              className={inputClass}
            />
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-300">
            <span className="block mb-1 font-medium">Tonalidad</span>
            <select
              aria-label="Tonalidad de la canción"
              value={songKey}
              disabled={busy}
              onChange={(e) => setSongKey(e.target.value)}
              className={inputClass}
            >
              {SONG_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700 dark:text-slate-300">
            <span className="block mb-1 font-medium">Precuenta</span>
            <select
              aria-label="Compases de precuenta"
              value={countInBars}
              disabled={busy}
              onChange={(e) => setCountInBars(parseInt(e.target.value))}
              className={inputClass}
            >
              <option value={0}>Sin precuenta</option>
              <option value={1}>1 compás</option>
              <option value={2}>2 compases</option>
            </select>
          </label>
          <label className="col-span-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={monitor} onChange={(e) => setMonitor(e.target.checked)} />
            Escuchar el teclado en el navegador
            <span className="text-xs text-slate-400">(apagalo si ya lo oís por otro lado)</span>
          </label>
        </div>
      )}

      {inputId && (
        <div className="flex items-center gap-4">
          <div
            aria-live="polite"
            className="flex-1 min-h-[4.5rem] rounded-xl bg-slate-50 dark:bg-[#101322] flex flex-col items-center justify-center"
          >
            <span className="text-3xl font-bold text-slate-900 dark:text-white" aria-label="Acorde que suena">
              {recorder.sounding ?? '—'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums" aria-label="Posición">
              {phase === 'count-in'
                ? `Precuenta ${recorder.countIn ?? ''}`
                : phase === 'recording' && recorder.position
                  ? `Compás ${recorder.position.bar} · tiempo ${recorder.position.beat}`
                  : `${songKey} · ${timeSignature} · ${bpm} BPM`}
            </span>
          </div>
          {busy ? (
            <button
              type="button"
              onClick={recorder.stop}
              className="px-5 py-4 rounded-xl font-semibold text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center gap-2"
            >
              <Square className="w-4 h-4 fill-current" />
              Parar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void recorder.start()}
              className="px-5 py-4 rounded-xl font-semibold text-sm bg-red-500 hover:bg-red-600 text-white flex items-center gap-2"
            >
              <Circle className="w-4 h-4 fill-current" />
              {phase === 'done' ? 'Grabar de nuevo' : 'Grabar'}
            </button>
          )}
        </div>
      )}

      {phase === 'recording' && recorder.liveLines.length > 0 && (
        <pre className="text-sm font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
          {recorder.liveLines.join('\n')}
        </pre>
      )}

      {phase === 'done' && recording && (
        <div className="space-y-4">
          {recording.progression.bars.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No se detectaron acordes. Probá de nuevo tocando al menos tres notas por acorde.
            </p>
          ) : null}
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            <span className="block mb-1 font-medium">Nombre de la sección</span>
            <input
              type="text"
              aria-label="Nombre de la sección"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              className={inputClass}
            />
          </label>
          <div>
            <textarea
              aria-label="Progresión grabada"
              value={barText}
              onChange={(e) => setBarText(e.target.value)}
              rows={Math.min(12, Math.max(3, barText.split('\n').length + 1))}
              placeholder="Am | G | C | F |"
              className={cn(inputClass, 'font-mono text-sm resize-y')}
            />
            {parsedBars.invalidLines.length > 0 && (
              <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
                Líneas no válidas: {parsedBars.invalidLines.join(', ')}. Usá el formato «Am | G 2 | C 2 |».
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Un compás por celda ({beatsPerBar} tiempos; «G 2» = medio compás). Se agrega al final como
              sección propia; la letra existente no se toca.
              {bpmChanged ? ` También se guarda el BPM nuevo (${bpm}).` : ''}
              {keyChanged ? ` También se guarda la tonalidad (${songKey}).` : ''}
            </p>
          </div>
          <p className="text-xs text-slate-400">
            {recording.notes.length} notas · {Math.round(recording.durationSeconds)} s · {parsedBars.barCount}{' '}
            compases
          </p>
          <button
            type="button"
            onClick={handleApply}
            disabled={chordsInvalid}
            className={cn(
              'w-full py-3 rounded-xl font-semibold text-sm',
              'bg-indigo-500 text-white hover:bg-indigo-600',
              'disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed',
              'transition-colors',
            )}
          >
            Agregar a la canción
          </button>
        </div>
      )}
    </section>
  )
}
