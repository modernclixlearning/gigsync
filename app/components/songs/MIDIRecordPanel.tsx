import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Magnet, Minus, Piano, Play, Plus, Square, Trash2, Undo2, X } from 'lucide-react'
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

/** Play / Stop / Record, side by side like a DAW's transport. */
const transportButtonClass = cn(
  'px-4 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors',
  'disabled:cursor-not-allowed disabled:opacity-40',
)

/** Grid of the piano roll (lines, snapping and quantize): subdivisions of the beat. */
const GRID_STEPS = [
  { value: 1, label: 'Negras' },
  { value: 2, label: 'Corcheas' },
  { value: 3, label: 'Tresillos' },
  { value: 4, label: 'Semicorcheas' },
] as const

/** The take being corrected: its notes and how long it runs (bars can be added). */
interface Take {
  notes: NoteEvent[]
  durationSeconds: number
}

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
 * land on a piano roll; then play the take back and edit it (move, stretch,
 * add or delete notes on a subdivided grid, quantize, add bars), and append
 * the chords to the song as their own section, ready for adding the lyrics.
 */
export function MIDIRecordPanel({ timeSignature, currentBpm, currentKey, onApply, onClose }: MIDIRecordPanelProps) {
  const beatsPerBar = beatsPerBarFromTimeSignature(timeSignature)
  const { access, accessStatus, inputs } = useMIDIAccess(true)
  const [inputId, setInputId] = useState<string | null>(null)
  const [bpm, setBpm] = useState(clampBpm(currentBpm))
  /** What the BPM box shows while typing; becomes `bpm` once it's a valid tempo. */
  const [bpmText, setBpmText] = useState(String(bpm))
  const [songKey, setSongKey] = useState(currentKey || 'C')
  const [countInBars, setCountInBars] = useState(1)
  const [monitor, setMonitor] = useState(true)

  const [barText, setBarText] = useState('')
  const [sectionName, setSectionName] = useState(RECORDED_SECTION_NAME)

  /** The take being corrected, with undo history. */
  const [take, setTake] = useState<Take | null>(null)
  const [history, setHistory] = useState<Take[]>([])
  /** Notes selected in the piano roll (indices into the take). */
  const [selection, setSelection] = useState<number[]>([])
  const [gridStep, setGridStep] = useState<number>(2)
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
    setTake(recording ? { notes: recording.notes, durationSeconds: recording.durationSeconds } : null)
    setHistory([])
    setSelection([])
  }, [recording])

  // Chords follow the corrected take; editing notes rewrites the bar lines.
  const takeProgression = useMemo(
    () => (recording && take ? recordingToProgression(take.notes, take.durationSeconds, recording.grid) : null),
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
  // Keyboard focus moves into the view, off whatever opened it underneath.
  const dialogRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus({ preventScroll: true })
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

  const editTake = (next: Take) => {
    if (!take) return
    stopPlayback()
    setHistory((previous) => [...previous, take])
    setTake(next)
  }
  const changeNotes = (notes: NoteEvent[]) => {
    if (take) editTake({ ...take, notes })
  }
  // With notes selected, Cuantizar and Borrar act on them only.
  const quantize = () => {
    if (!recording || !take) return
    const stepSeconds = beatSeconds(recording.grid.bpm) / gridStep
    const chosen = new Set(selection)
    changeNotes(
      chosen.size === 0
        ? quantizeNotes(take.notes, stepSeconds)
        : take.notes.map((note, i) => (chosen.has(i) ? quantizeNotes([note], stepSeconds)[0] : note)),
    )
  }
  const deleteSelection = () => {
    if (!take || selection.length === 0) return
    const chosen = new Set(selection)
    setSelection([])
    changeNotes(take.notes.filter((_, i) => !chosen.has(i)))
  }

  // Bars of the take: more can be added at the end to draw into; empty ones removed.
  const takeBarSeconds = recording ? beatSeconds(recording.grid.bpm) * recording.grid.beatsPerBar : 1
  const takeBars = take ? Math.max(1, Math.ceil(take.durationSeconds / takeBarSeconds - 1e-6)) : 0
  const barsWithNotes = take
    ? Math.ceil(Math.max(0, ...take.notes.map((n) => n.startTimeSeconds + n.durationSeconds)) / takeBarSeconds - 1e-6)
    : 0
  const canRemoveBar = takeBars > Math.max(1, barsWithNotes)
  const addBar = () => {
    if (take) editTake({ ...take, durationSeconds: (takeBars + 1) * takeBarSeconds })
  }
  const removeBar = () => {
    if (take && canRemoveBar) editTake({ ...take, durationSeconds: (takeBars - 1) * takeBarSeconds })
  }
  const undo = () => {
    const previous = history[history.length - 1]
    if (!previous) return
    stopPlayback()
    setTake(previous)
    setHistory(history.slice(0, -1))
    setSelection([])
  }
  const canPlay = phase === 'done' && !!recording && !!take && take.notes.length > 0
  const playTake = () => {
    if (recording && take) void playback.play(take.notes, { grid: recording.grid, durationSeconds: take.durationSeconds })
  }
  /** One Stop for both: ends the recording, or the playback. */
  const stopTransport = () => {
    if (busy) recorder.stop()
    else stopPlayback()
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
          notes: take.notes,
          bpm: recording.grid.bpm,
          durationSeconds: take.durationSeconds,
          progression: takeProgression,
          getPlayhead: playback.playing ? playback.position : undefined,
          onChangeNotes: changeNotes,
        }
      : busy
        ? {
            notes: live?.notes ?? [],
            bpm,
            // One bar ahead of the playhead, so there's always room to play into.
            durationSeconds: Math.max(0, live?.time ?? 0) + barSeconds,
            progression: recorder.liveProgression,
            getPlayhead: livePlayhead,
            onChangeNotes: undefined,
          }
        : {
            notes: [],
            bpm,
            durationSeconds: barSeconds * 4,
            progression: null,
            getPlayhead: undefined,
            onChangeNotes: undefined,
          }

  return (
    <section
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Grabar acordes desde teclado MIDI"
      className="fixed inset-0 z-50 flex flex-col outline-none bg-slate-50 dark:bg-[#101322] text-slate-900 dark:text-white"
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

      {/* Everything below the header scrolls; the roll keeps a usable height even on short screens. */}
      <div className="flex-1 min-h-0 overflow-y-auto">
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
                value={bpmText}
                min={20}
                max={300}
                disabled={busy}
                onChange={(e) => {
                  // Typed freely ("9" on the way to "90" is fine); the tempo follows once it's in range.
                  setBpmText(e.target.value)
                  const typed = parseInt(e.target.value)
                  if (typed >= 20 && typed <= 300) setBpm(typed)
                }}
                onBlur={() => setBpmText(String(bpm))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                }}
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
                <div role="group" aria-label="Transporte" className="flex items-stretch gap-1.5">
                  <button
                    type="button"
                    onClick={playTake}
                    disabled={!canPlay || playback.playing}
                    aria-pressed={playback.playing}
                    className={cn(
                      transportButtonClass,
                      playback.playing
                        ? 'bg-emerald-500 text-white disabled:opacity-100 disabled:cursor-default'
                        : 'bg-white dark:bg-[#1a1f36] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800',
                    )}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Reproducir
                  </button>
                  <button
                    type="button"
                    onClick={stopTransport}
                    disabled={!busy && !playback.playing}
                    className={cn(
                      transportButtonClass,
                      'bg-white dark:bg-[#1a1f36] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800',
                    )}
                  >
                    <Square className="w-4 h-4 fill-current" />
                    Parar
                  </button>
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={busy}
                    aria-pressed={busy}
                    className={cn(
                      transportButtonClass,
                      busy
                        ? 'bg-red-500 text-white animate-pulse disabled:opacity-100 disabled:cursor-default'
                        : 'bg-red-500 hover:bg-red-600 text-white',
                    )}
                  >
                    <Circle className="w-4 h-4 fill-current" />
                    Grabar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="h-[max(18rem,55vh)] px-4 pb-3">
          <PianoRoll
            notes={roll.notes}
            bpm={roll.bpm}
            beatsPerBar={beatsPerBar}
            durationSeconds={roll.durationSeconds}
            progression={roll.progression}
            getPlayhead={roll.getPlayhead}
            subdivision={gridStep}
            onChangeNotes={roll.onChangeNotes}
            onAudition={roll.onChangeNotes ? playback.audition : undefined}
            selection={roll.onChangeNotes ? selection : undefined}
            onSelectionChange={roll.onChangeNotes ? setSelection : undefined}
          />
        </div>

        {phase === 'done' && recording && take && (
          <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f36] px-4 py-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                <span>Grilla</span>
                <select
                  aria-label="Grilla"
                  value={gridStep}
                  onChange={(e) => setGridStep(parseInt(e.target.value))}
                  className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm"
                >
                  {GRID_STEPS.map((step) => (
                    <option key={step.value} value={step.value}>
                      {step.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={quantize} disabled={take.notes.length === 0} className={toolButtonClass}>
                <Magnet className="w-4 h-4" />
                {selection.length > 0 ? 'Cuantizar selección' : 'Cuantizar'}
              </button>
              {selection.length > 0 && (
                <button type="button" onClick={deleteSelection} className={toolButtonClass}>
                  <Trash2 className="w-4 h-4" />
                  Borrar selección
                </button>
              )}
              <button type="button" onClick={addBar} className={toolButtonClass}>
                <Plus className="w-4 h-4" />
                Compás
              </button>
              <button
                type="button"
                onClick={removeBar}
                disabled={!canRemoveBar}
                aria-label="Quitar compás"
                className={toolButtonClass}
              >
                <Minus className="w-4 h-4" />
                Compás
              </button>
              <button type="button" onClick={undo} disabled={history.length === 0} className={toolButtonClass}>
                <Undo2 className="w-4 h-4" />
                Deshacer
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {take.notes.length} notas
                {selection.length > 0 ? ` (${selection.length} seleccionadas)` : ''} · {takeBars} compases
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clic elige una nota; Shift o Ctrl+clic suma o saca, arrastrar en un lugar vacío elige con un recuadro
              y Ctrl+A elige todas. Arrastrá la selección para moverla y el borde derecho para estirarla; flechas la
              mueven (↑↓ un semitono, Shift una octava; ←→ un paso, Shift un compás), Ctrl+D la duplica y Supr la
              borra. Doble clic agrega o borra una nota. Todo se ajusta a la grilla.
            </p>

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
      </div>
    </section>
  )
}
