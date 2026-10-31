import { useCallback, useEffect, useMemo, useState } from 'react'
import { Circle, Magnet, Piano, Play, Square, Undo2, X } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useMIDIAccess, type MIDIInputInfo } from '~/hooks/useMIDIAccess'
import { useMIDIRecorder, type LiveTake } from '~/hooks/useMIDIRecorder'
import { useTakePlayback } from '~/hooks/useTakePlayback'
import { quantizeNotes } from '~/lib/midi/pianoRoll'
import { beatSeconds, recordingToProgression } from '~/lib/midi/recording'
import {
  beatsPerBarFromTimeSignature,
  buildDetectedSection,
  parseBarText,
  progressionToBarLines,
} from '~/lib/audioAnalysis/chordproOutput'
import type { NoteEvent } from '~/lib/audioAnalysis/types'
import type { AudioAnalysisApply } from './AudioAnalysisPanel'
import { PianoRoll } from './PianoRoll'
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
  'w-full px-3 py-2 rounded-xl',
  'bg-white dark:bg-[#1a1f36]',
  'border border-slate-200 dark:border-slate-700',
  'text-slate-900 dark:text-white',
  'placeholder:text-slate-400',
  'focus:outline-none focus:ring-2 focus:ring-indigo-500',
)

const toolButtonClass = cn(
  'px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5',
  'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200',
  'hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors',
)

/** Quantize options: subdivisions of the beat. */
const QUANTIZE_STEPS = [
  { value: 1, label: 'negras' },
  { value: 2, label: 'corcheas' },
  { value: 4, label: 'semicorcheas' },
] as const

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
 * Full-screen recording view: record the chords played on a MIDI keyboard
 * against a click (count-in + metronome at the song's tempo) and watch them
 * land on a piano roll; then play the take back, delete stray notes or
 * quantize, and append the chords to the song as their own section, ready for
 * adding the lyrics.
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

  /** The take being corrected (notes deleted / quantized), with undo history. */
  const [take, setTake] = useState<NoteEvent[] | null>(null)
  const [history, setHistory] = useState<NoteEvent[][]>([])
  const [quantizeStep, setQuantizeStep] = useState<number>(2)
  const [live, setLive] = useState<LiveTake | null>(null)

  // Keep a valid selection as keyboards are plugged/unplugged.
  useEffect(() => {
    if (inputId && inputs.some((input) => input.id === inputId)) return
    setInputId(defaultKeyboardInput(inputs)?.id ?? null)
  }, [inputs, inputId])

  const recorder = useMIDIRecorder({ access, inputId, bpm, beatsPerBar, countInBars, monitor })
  const playback = useTakePlayback()
  const { phase, recording, peek, reset } = recorder
  const stopPlayback = playback.stop
  const busy = phase === 'count-in' || phase === 'recording'

  useEffect(() => {
    setTake(recording?.notes ?? null)
    setHistory([])
  }, [recording])

  // Chords follow the corrected take; editing notes rewrites the bar lines.
  const takeProgression = useMemo(
    () => (recording && take ? recordingToProgression(take, recording.durationSeconds, recording.grid) : null),
    [recording, take],
  )
  useEffect(() => {
    if (takeProgression) setBarText(progressionToBarLines(takeProgression).join('\n'))
  }, [takeProgression])

  // The take in progress, redrawn a dozen times a second while recording.
  useEffect(() => {
    if (!busy) {
      setLive(null)
      return
    }
    const id = setInterval(() => setLive(peek()), 80)
    return () => clearInterval(id)
  }, [busy, peek])

  // Full screen: the page behind doesn't scroll; Escape closes when not recording.
  const close = useCallback(() => {
    stopPlayback()
    reset()
    onClose()
  }, [stopPlayback, reset, onClose])
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, close])

  const editTake = (next: NoteEvent[]) => {
    if (!take) return
    stopPlayback()
    setHistory((previous) => [...previous, take])
    setTake(next)
  }
  const deleteNote = (index: number) => {
    if (take) editTake(take.filter((_, i) => i !== index))
  }
  const quantize = () => {
    if (recording && take) editTake(quantizeNotes(take, beatSeconds(recording.grid.bpm) / quantizeStep))
  }
  const undo = () => {
    const previous = history[history.length - 1]
    if (!previous) return
    stopPlayback()
    setTake(previous)
    setHistory(history.slice(0, -1))
  }
  const togglePlayback = () => {
    if (playback.playing) stopPlayback()
    else if (recording && take) void playback.play(take, { grid: recording.grid, durationSeconds: recording.durationSeconds })
  }
  const startRecording = () => {
    stopPlayback()
    void recorder.start()
  }

  const parsedBars = parseBarText(barText, beatsPerBar)
  const chordsInvalid = parsedBars.invalidLines.length > 0 || parsedBars.lines.length === 0
  // The take's tempo is the one it was played at, even if the BPM box changed since.
  const takeBpm = recording?.grid.bpm ?? bpm
  const bpmChanged = takeBpm !== currentBpm
  const keyChanged = songKey !== currentKey

  const handleApply = () => {
    if (chordsInvalid) return
    stopPlayback()
    onApply({
      bpm: bpmChanged ? takeBpm : undefined,
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

  const barSeconds = beatSeconds(bpm) * beatsPerBar
  const livePlayhead = useCallback(() => peek()?.time ?? null, [peek])
  const roll =
    phase === 'done' && recording && take
      ? {
          notes: take,
          bpm: recording.grid.bpm,
          durationSeconds: recording.durationSeconds,
          progression: takeProgression,
          getPlayhead: playback.playing ? playback.position : undefined,
          onDeleteNote: deleteNote,
        }
      : busy
        ? {
            notes: live?.notes ?? [],
            bpm,
            // One bar ahead of the playhead, so there's always room to play into.
            durationSeconds: Math.max(0, live?.time ?? 0) + barSeconds,
            progression: recorder.liveProgression,
            getPlayhead: livePlayhead,
            onDeleteNote: undefined,
          }
        : {
            notes: [],
            bpm,
            durationSeconds: barSeconds * 4,
            progression: null,
            getPlayhead: undefined,
            onDeleteNote: undefined,
          }

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label="Grabar acordes desde teclado MIDI"
      className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-[#101322] text-slate-900 dark:text-white"
    >
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <Piano className="w-5 h-5 text-indigo-500 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Grabar acordes desde teclado MIDI</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            Tocá los acordes con el click. Al parar, revisá la toma y agregá la progresión a la canción. Los pads
            (canal 10) se ignoran.
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="ml-auto p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {accessMessage && (
        <p
          role={accessStatus === 'requesting' ? 'status' : 'alert'}
          className="px-4 pt-3 text-sm text-slate-600 dark:text-slate-300"
        >
          {accessMessage}
        </p>
      )}

      {inputs.length > 0 && (
        <div className="flex flex-wrap items-end gap-3 px-4 py-3">
          <label className="text-sm text-slate-700 dark:text-slate-300 w-48">
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
          <label className="text-sm text-slate-700 dark:text-slate-300 w-24">
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
          <label className="text-sm text-slate-700 dark:text-slate-300 w-24">
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
          <label className="text-sm text-slate-700 dark:text-slate-300 w-36">
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
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={monitor} onChange={(e) => setMonitor(e.target.checked)} />
            Escuchar el teclado en el navegador
          </label>

          {inputId && (
            <div className="ml-auto flex items-stretch gap-3">
              <div
                aria-live="polite"
                className="min-w-[9rem] px-4 py-1 rounded-xl bg-white dark:bg-[#1a1f36] border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center"
              >
                <span className="text-2xl font-bold leading-tight" aria-label="Acorde que suena">
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
                  className="px-5 rounded-xl font-semibold text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center gap-2"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Parar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-5 rounded-xl font-semibold text-sm bg-red-500 hover:bg-red-600 text-white flex items-center gap-2"
                >
                  <Circle className="w-4 h-4 fill-current" />
                  {phase === 'done' ? 'Grabar de nuevo' : 'Grabar'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-h-[12rem] px-4 pb-3">
        <PianoRoll
          notes={roll.notes}
          bpm={roll.bpm}
          beatsPerBar={beatsPerBar}
          durationSeconds={roll.durationSeconds}
          progression={roll.progression}
          getPlayhead={roll.getPlayhead}
          onDeleteNote={roll.onDeleteNote}
        />
      </div>

      {phase === 'done' && recording && take && (
        <div className="max-h-[45vh] overflow-y-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f36] px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={togglePlayback} disabled={take.length === 0} className={toolButtonClass}>
              {playback.playing ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {playback.playing ? 'Detener' : 'Escuchar la toma'}
            </button>
            <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              <span>Cuantizar a</span>
              <select
                aria-label="Cuantizar a"
                value={quantizeStep}
                onChange={(e) => setQuantizeStep(parseInt(e.target.value))}
                className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm"
              >
                {QUANTIZE_STEPS.map((step) => (
                  <option key={step.value} value={step.value}>
                    {step.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={quantize} disabled={take.length === 0} className={toolButtonClass}>
              <Magnet className="w-4 h-4" />
              Cuantizar
            </button>
            <button type="button" onClick={undo} disabled={history.length === 0} className={toolButtonClass}>
              <Undo2 className="w-4 h-4" />
              Deshacer
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {take.length} notas · {parsedBars.barCount} compases · clic en una nota para borrarla
            </span>
          </div>

          {takeProgression && takeProgression.bars.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No se detectaron acordes. Probá de nuevo tocando al menos tres notas por acorde.
            </p>
          )}

          <div className="grid gap-3 md:grid-cols-[1fr_18rem]">
            <div>
              <textarea
                aria-label="Progresión grabada"
                value={barText}
                onChange={(e) => setBarText(e.target.value)}
                rows={Math.min(8, Math.max(2, barText.split('\n').length + 1))}
                placeholder="Am | G | C | F |"
                className={cn(inputClass, 'font-mono text-sm resize-y')}
              />
              {parsedBars.invalidLines.length > 0 && (
                <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Líneas no válidas: {parsedBars.invalidLines.join(', ')}. Usá el formato «Am | G 2 | C 2 |».
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Un compás por celda ({beatsPerBar} tiempos; «G 2» = medio compás). Si borrás o cuantizás notas, el
                texto se vuelve a armar. Se agrega al final como sección propia; la letra existente no se toca.
                {bpmChanged ? ` También se guarda el BPM de la toma (${takeBpm}).` : ''}
                {keyChanged ? ` También se guarda la tonalidad (${songKey}).` : ''}
              </p>
            </div>
            <div className="space-y-3">
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
          </div>
        </div>
      )}
    </section>
  )
}
