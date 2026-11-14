/**
 * Full-screen editor of what one role of the band plays in the song, note by
 * note: the lead melody or the arrangement (written tracks), or a live take of
 * the drums, the bass or the chords (which then plays instead of the role's
 * pattern). It is written on a piano roll that runs the whole song,
 * with the song's chords on top: by hand (pencil, drag, stretch) or played on
 * a MIDI controller / the on-screen keys against the click, over the chords.
 * Every change is saved with the song.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as Tone from 'tone'
import { Circle, Eraser, Keyboard, Magnet, Minus, Pencil, Play, Plus, Square, Trash2, Undo2, X } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useMIDIAccess } from '~/hooks/useMIDIAccess'
import { useMIDIRecorder, type LiveTake, type MIDIRecording } from '~/hooks/useMIDIRecorder'
import { useTrackPreview, type PreviewLayer, type PreviewNote } from '~/hooks/useTrackPreview'
import {
  BAND_ROLE_LABELS,
  TRACK_VOICES,
  TRACK_VOICE_LABELS,
  eventsToTrackNotes,
  isTrackRole,
  normalizeDrumNotes,
  trackEndBeat,
  trackHasNotes,
  trackNotesToEvents,
  trackVoice,
  type BandRole,
  type BandTrack,
  type TrackNote,
  type TrackVoice,
} from '~/lib/audio/bandTracks'
import { DEFAULT_BASS_VOICE, type BassVoice } from '~/lib/audio/bandSound'
import { voiceChord } from '~/lib/audio/chordVoicing'
import {
  createBassInstrument,
  createDrumKitInstrument,
  createKeysInstrument,
  createTrackInstrument,
  type ChordInstrument,
  type PlayableVoice,
} from '~/lib/audio/instruments'
import { quantizeNotes, resizeNotes } from '~/lib/midi/pianoRoll'
import { beatSeconds } from '~/lib/midi/recording'
import type { ChordEvent } from '~/lib/timeline/chordEvents'
import type { ChordProgression, NoteEvent } from '~/lib/audioAnalysis/types'
import { defaultKeyboardInput } from '~/components/songs/MIDIRecordPanel'
import { PianoRoll } from '~/components/songs/PianoRoll'
import { VirtualKeyboard } from '~/components/songs/VirtualKeyboard'

export interface TrackEditorProps {
  role: BandRole
  /** What the song has for the role. Read when the editor opens; from then on the editor is the source. */
  track: { voice?: string; notes: TrackNote[] } | undefined
  /** The notes (and, for a written track, the sound) after a change. */
  onChange: (part: { notes: TrackNote[]; voice?: TrackVoice }) => void
  /** Sound of the bass channel, for the bass take. */
  bassVoice?: BassVoice
  bpm: number
  beatsPerBar: number
  /** Length of the song in beats (0 when it has no bars to follow). */
  totalBeats: number
  /** The song's chords: drawn over the roll and played under the track. */
  chords: readonly ChordEvent[]
  /** The song's other written track, heard along while writing this one. */
  otherTrack?: BandTrack
  onClose: () => void
}

/** Grid of the piano roll (lines, snapping and quantize): subdivisions of the beat. */
const GRID_STEPS = [
  { value: 1, label: 'Negras' },
  { value: 2, label: 'Corcheas' },
  { value: 3, label: 'Tresillos' },
  { value: 4, label: 'Semicorcheas' },
] as const

/** Pitches always on the roll, so there is room to write from scratch. */
const ROLL_RANGE: Record<BandRole, { low: number; high: number }> = {
  // The kit: C2 kick, D2 snare, F♯2 hi-hat.
  drums: { low: 36, high: 47 },
  bass: { low: 28, high: 60 },
  keys: { low: 36, high: 96 },
  lead: { low: 48, high: 96 },
  arrangement: { low: 36, high: 91 },
}

/** The instrument a role is played, monitored and listened to with. */
function createRoleInstrument(role: BandRole, voice: TrackVoice | undefined, bassVoice: BassVoice): ChordInstrument {
  if (role === 'drums') return createDrumKitInstrument()
  if (role === 'bass') return createBassInstrument(bassVoice, { reportStatus: false })
  if (role === 'keys') return createKeysInstrument('piano', { reportStatus: false })
  return createTrackInstrument(voice ?? trackVoice(role, undefined))
}

const MIN_BARS = 4
const MAX_HISTORY = 50

const toolButtonClass = cn(
  'h-10 shrink-0 px-3 rounded-xl text-sm font-medium flex items-center gap-1.5',
  'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200',
  'hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors',
)

const transportButtonClass = cn(
  'h-11 px-4 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors',
  'disabled:cursor-not-allowed disabled:opacity-40',
)

const plainTransportClass =
  'bg-white dark:bg-[#1a1f36] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'

const fieldClass = cn(
  'h-10 w-full px-3 rounded-xl text-sm',
  'bg-white dark:bg-[#1a1f36] border border-slate-200 dark:border-slate-700',
  'text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500',
)

const chipClass = (selected: boolean) =>
  cn(
    'h-9 shrink-0 rounded-full px-3 text-sm font-medium transition-colors',
    selected
      ? 'bg-indigo-600 text-white'
      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
  )

/** An instrument alive while the editor is open, rebuilt when `key` changes. */
function useInstrument(create: () => ChordInstrument | null, key: string) {
  const ref = useRef<PlayableVoice | null>(null)
  const createRef = useRef(create)
  createRef.current = create
  useEffect(() => {
    const instrument = createRef.current()
    ref.current = instrument?.synth ?? null
    return () => {
      ref.current = null
      instrument?.dispose()
    }
  }, [key])
  return ref
}

const asPreviewNotes = (notes: readonly TrackNote[]): PreviewNote[] =>
  notes.map((note) => ({ beat: note.beat, beats: note.beats, pitches: [note.pitch], velocity: note.velocity }))

/** The song's chords as the labels the piano roll draws over its bars. */
function chordLabels(chords: readonly ChordEvent[], bpm: number, beatsPerBar: number): ChordProgression {
  const beat = beatSeconds(bpm)
  return {
    beatsPerBar,
    downbeatOffset: 0,
    bars: chords.map((event, index) => {
      const startTime = event.startBeat * beat
      const endTime = (event.startBeat + event.durationBeats) * beat
      return {
        index,
        startTime,
        endTime,
        cells: [{ chord: event.chord, beats: event.durationBeats, startTime, endTime, confidence: 1 }],
      }
    }),
  }
}

export function TrackEditor({
  role,
  track,
  onChange,
  bassVoice = DEFAULT_BASS_VOICE,
  bpm,
  beatsPerBar,
  totalBeats,
  chords,
  otherTrack,
  onClose,
}: TrackEditorProps) {
  const bpb = Math.max(1, Math.round(beatsPerBar))
  const beat = beatSeconds(bpm)
  const title = BAND_ROLE_LABELS[role]
  const voices = isTrackRole(role) ? TRACK_VOICES[role] : []
  /** What the role sounds with: the track's voice, or the channel's own instrument. */
  const soundKey = (current: TrackVoice | undefined) => `${role}:${current ?? (role === 'bass' ? bassVoice : '')}`

  const [voice, setVoice] = useState<TrackVoice | undefined>(() => (isTrackRole(role) ? trackVoice(role, track?.voice) : undefined))
  const [notes, setNotes] = useState<TrackNote[]>(() => track?.notes ?? [])
  const [history, setHistory] = useState<TrackNote[][]>([])
  const [selection, setSelection] = useState<number[]>([])
  const [gridStep, setGridStep] = useState<number>(2)
  const [extraBars, setExtraBars] = useState(0)
  const [startBar, setStartBar] = useState(1)
  const [countInBars, setCountInBars] = useState(1)
  // The chords under the take — except for the chords' own take, which they would double.
  const [withChords, setWithChords] = useState(role !== 'keys')
  const [virtualOn, setVirtualOn] = useState(false)
  const touchScreen = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches
  const [drawMode, setDrawMode] = useState(touchScreen)
  const [live, setLive] = useState<LiveTake | null>(null)

  const notesRef = useRef(notes)
  notesRef.current = notes

  /* ── Saving ── */

  const save = useCallback(
    (nextNotes: TrackNote[], nextVoice: TrackVoice | undefined) => onChange({ notes: nextNotes, voice: nextVoice }),
    [onChange],
  )
  const voiceRef = useRef(voice)
  voiceRef.current = voice
  const commit = useCallback(
    (written: TrackNote[]) => {
      // Drums live on the three pitches of the kit, whatever row or pad they came from.
      const next = role === 'drums' ? normalizeDrumNotes(written) : written
      setHistory((previous) => [...previous.slice(-(MAX_HISTORY - 1)), notesRef.current])
      setNotes(next)
      save(next, voiceRef.current)
    },
    [save, role],
  )
  const changeVoice = (next: TrackVoice) => {
    setVoice(next)
    save(notes, next)
  }

  /* ── Song length ── */

  const songBars = Math.max(MIN_BARS, Math.ceil(Math.max(totalBeats, trackEndBeat(notes)) / bpb - 1e-6))
  const bars = songBars + extraBars
  const lengthBeats = bars * bpb
  const fromBar = Math.min(bars, Math.max(1, startBar))
  const fromBeat = (fromBar - 1) * bpb

  /* ── Instruments ── */

  const instrumentRef = useInstrument(() => createRoleInstrument(role, voice, bassVoice), soundKey(voice))
  const otherSounds = trackHasNotes(otherTrack) && !otherTrack!.muted
  const otherRef = useInstrument(
    () => (otherSounds ? createTrackInstrument(otherTrack!.voice) : null),
    otherSounds ? otherTrack!.voice : 'none',
  )
  const pianoRef = useInstrument(() => {
    const piano = createKeysInstrument('piano', { reportStatus: false })
    piano.synth.volume.value = -8
    return piano
  }, 'piano')

  const chordNotes = useMemo<PreviewNote[]>(
    () =>
      chords.flatMap((event) => {
        const voicing = voiceChord(event.chord)
        if (!voicing) return []
        return [{ beat: event.startBeat, beats: event.durationBeats * 0.95, pitches: [voicing.bass, ...voicing.chord], velocity: 0.55 }]
      }),
    [chords],
  )
  const labels = useMemo(() => chordLabels(chords, bpm, bpb), [chords, bpm, bpb])

  /** What plays along: this track (not while it is being recorded), the other one and the chords. */
  const layers = (includeSelf: boolean): PreviewLayer[] => {
    const out: PreviewLayer[] = []
    if (includeSelf && instrumentRef.current) out.push({ instrument: instrumentRef.current, notes: asPreviewNotes(notes) })
    if (otherRef.current && otherSounds) out.push({ instrument: otherRef.current, notes: asPreviewNotes(otherTrack!.notes) })
    if (withChords && pianoRef.current) out.push({ instrument: pianoRef.current, notes: chordNotes })
    return out
  }

  /* ── Controller, recording and listening ── */

  const { access, accessStatus, inputs } = useMIDIAccess(true)
  const [inputId, setInputId] = useState<string | null>(null)
  useEffect(() => {
    if (inputId && inputs.some((input) => input.id === inputId)) return
    setInputId(defaultKeyboardInput(inputs)?.id ?? null)
  }, [inputs, inputId])

  const recorder = useMIDIRecorder({
    access,
    inputId,
    bpm,
    beatsPerBar: bpb,
    countInBars,
    monitor: true,
    createMonitor: () => createRoleInstrument(role, voice, bassVoice),
    monitorKey: soundKey(voice),
    acceptDrumChannel: role === 'drums',
  })
  const preview = useTrackPreview()
  const { phase, recording, peek } = recorder
  const stopPreview = preview.stop
  const busy = phase === 'count-in' || phase === 'recording'
  const canRecord = !!inputId || virtualOn

  /** Beat of the song the take in progress (or just finished) started on. */
  const recordFromRef = useRef(0)

  const startRecording = async () => {
    stopPreview()
    recordFromRef.current = fromBeat
    await recorder.start()
    const origin = recorder.origin()
    if (origin !== null) void preview.start({ bpm, fromBeat, origin, layers: layers(false) })
  }
  const stopTransport = () => {
    if (busy) recorder.stop()
    stopPreview()
  }
  const play = () => {
    void preview.start({ bpm, fromBeat, toBeat: lengthBeats, layers: layers(true) })
  }

  // A finished take replaces what the track had in the stretch it covers.
  const handledRef = useRef<MIDIRecording | null>(null)
  useEffect(() => {
    if (!recording || handledRef.current === recording) return
    handledRef.current = recording
    const from = recordFromRef.current
    const played = eventsToTrackNotes(recording.notes, recording.grid.bpm, from)
    if (played.length === 0) return
    const to = from + recording.durationSeconds / beatSeconds(recording.grid.bpm)
    setSelection([])
    commit([...notesRef.current.filter((note) => note.beat < from || note.beat >= to), ...played])
  }, [recording, commit])

  // The take in progress, redrawn a dozen times a second while recording.
  useEffect(() => {
    if (!busy) {
      setLive(null)
      return
    }
    const id = setInterval(() => setLive(peek()), 80)
    return () => clearInterval(id)
  }, [busy, peek])

  /* ── The dialog ── */

  const close = useCallback(() => {
    stopPreview()
    recorder.reset()
    onClose()
  }, [stopPreview, recorder.reset, onClose])
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

  /* ── Editing ── */

  const events = useMemo(() => trackNotesToEvents(notes, bpm), [notes, bpm])
  const step = beat / gridStep
  const changeEvents = (next: NoteEvent[]) => {
    stopPreview()
    commit(eventsToTrackNotes(next, bpm))
  }
  const chosen = new Set(selection)
  const quantize = () =>
    changeEvents(
      chosen.size === 0
        ? quantizeNotes(events, step)
        : events.map((event, i) => (chosen.has(i) ? quantizeNotes([event], step)[0] : event)),
    )
  const stretch = (direction: 1 | -1) => {
    if (selection.length > 0) changeEvents(resizeNotes(events, selection, selection[0], direction * step, step))
  }
  const deleteSelection = () => {
    if (selection.length === 0) return
    setSelection([])
    changeEvents(events.filter((_, i) => !chosen.has(i)))
  }
  const clearAll = () => {
    setSelection([])
    stopPreview()
    commit([])
  }
  const undo = () => {
    const previous = history[history.length - 1]
    if (!previous) return
    stopPreview()
    setHistory(history.slice(0, -1))
    setSelection([])
    setNotes(previous)
    save(previous, voice)
  }
  const audition = useCallback(
    (pitch: number) => {
      const instrument = instrumentRef.current
      if (!instrument) return
      if (Tone.getContext().state !== 'running') void Tone.start().catch(() => undefined)
      instrument.triggerAttackRelease([Tone.Frequency(pitch, 'midi').toFrequency()], 0.25, Tone.immediate(), 0.7)
    },
    [instrumentRef],
  )

  /* ── What the roll shows ── */

  const recordFromSeconds = recordFromRef.current * beat
  const livePlayhead = useCallback(() => {
    const take = peek()
    return take ? recordFromRef.current * beatSeconds(bpm) + take.time : null
  }, [peek, bpm])
  const previewPlayhead = useCallback(() => {
    const position = preview.position()
    return position === null ? null : position * beatSeconds(bpm)
  }, [preview.position, bpm])
  const liveEvents = useMemo(
    () =>
      (live?.notes ?? []).map((note) => ({ ...note, startTimeSeconds: note.startTimeSeconds + recordFromSeconds })),
    [live, recordFromSeconds],
  )

  const accessMessage =
    accessStatus === 'granted' && inputs.length === 0
      ? 'No hay ningún controlador MIDI conectado. Escribe con el lápiz o abre el teclado en pantalla.'
      : accessStatus === 'unsupported'
        ? 'Este navegador no tiene Web MIDI (para un controlador usa Chrome o Edge). Puedes escribir con el lápiz o el teclado en pantalla.'
        : accessStatus === 'denied'
          ? 'No hay permiso para usar MIDI. Puedes escribir con el lápiz o el teclado en pantalla.'
          : null

  const positionText =
    phase === 'count-in'
      ? `Precuenta ${recorder.countIn ?? ''}`
      : phase === 'recording' && recorder.position
        ? `Grabando · compás ${recorder.position.bar + recordFromRef.current / bpb} · tiempo ${recorder.position.beat}`
        : `${notes.length} ${notes.length === 1 ? 'nota' : 'notas'} · ${bars} compases · ${bpm} BPM`

  const dialog = (
    <section
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} de la canción`}
      className="fixed inset-0 z-[70] flex flex-col outline-none bg-slate-50 dark:bg-[#101322] text-slate-900 dark:text-white"
    >
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums truncate" aria-live="polite">
            {positionText}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVirtualOn(!virtualOn)}
          aria-pressed={virtualOn}
          aria-label="Teclado en pantalla"
          title="Teclado en pantalla (táctil y teclas del ordenador)"
          className={cn(
            'ml-auto h-10 flex items-center gap-1.5 px-3 rounded-xl text-sm font-medium transition-colors',
            virtualOn
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
          )}
        >
          <Keyboard className="w-4 h-4" aria-hidden />
          <span className="hidden sm:inline">Teclado</span>
        </button>
        <button
          type="button"
          onClick={close}
          disabled={busy}
          aria-label="Cerrar"
          className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
        >
          <X className="w-5 h-5" aria-hidden />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-4 pt-3 space-y-3">
          {role === 'drums' && (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Los pads del controlador o, en las teclas, do = bombo, re = caja y fa♯ = hi-hat (en cualquier octava).
            </p>
          )}
          {!isTrackRole(role) && (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Mientras la canción tenga esta toma, suena lo grabado en lugar del patrón.
            </p>
          )}
          <div
            role="radiogroup"
            aria-label={`Sonido: ${title.toLowerCase()}`}
            className={cn('flex gap-1.5 overflow-x-auto scrollbar-hide', voices.length === 0 && 'hidden')}
          >
            {voices.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={voice === option}
                disabled={busy}
                onClick={() => changeVoice(option)}
                className={chipClass(voice === option)}
              >
                {TRACK_VOICE_LABELS[option]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div role="group" aria-label="Transporte" className="flex items-stretch gap-1.5">
              <button
                type="button"
                onClick={play}
                disabled={busy || preview.playing}
                aria-pressed={preview.playing && !busy}
                className={cn(
                  transportButtonClass,
                  preview.playing && !busy ? 'bg-emerald-500 text-white disabled:opacity-100 disabled:cursor-default' : plainTransportClass,
                )}
              >
                <Play className="w-4 h-4 fill-current" aria-hidden />
                <span className="sr-only sm:not-sr-only">Escuchar</span>
              </button>
              <button
                type="button"
                onClick={stopTransport}
                disabled={!busy && !preview.playing}
                className={cn(transportButtonClass, plainTransportClass)}
              >
                <Square className="w-4 h-4 fill-current" aria-hidden />
                <span className="sr-only sm:not-sr-only">Parar</span>
              </button>
              <button
                type="button"
                onClick={() => void startRecording()}
                disabled={busy || !canRecord}
                aria-pressed={busy}
                title={canRecord ? undefined : 'Conecta un controlador MIDI o abre el teclado en pantalla'}
                className={cn(
                  transportButtonClass,
                  'bg-red-500 text-white',
                  busy ? 'animate-pulse disabled:opacity-100 disabled:cursor-default' : 'hover:bg-red-600',
                )}
              >
                <Circle className="w-4 h-4 fill-current" aria-hidden />
                Grabar
              </button>
            </div>

            <label className="w-24 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span className="block mb-1">Desde el compás</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label="Compás desde el que se escucha y se graba"
                min={1}
                max={bars}
                value={fromBar}
                disabled={busy}
                onChange={(event) => setStartBar(parseInt(event.target.value) || 1)}
                className={fieldClass}
              />
            </label>
            <label className="w-32 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span className="block mb-1">Precuenta</span>
              <select
                aria-label="Compases de precuenta"
                value={countInBars}
                disabled={busy}
                onChange={(event) => setCountInBars(parseInt(event.target.value))}
                className={fieldClass}
              >
                <option value={0}>Sin precuenta</option>
                <option value={1}>1 compás</option>
                <option value={2}>2 compases</option>
              </select>
            </label>
            {inputs.length > 0 && (
              <label className="w-44 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span className="block mb-1">Controlador</span>
                <select
                  aria-label="Entrada MIDI"
                  value={inputId ?? ''}
                  disabled={busy}
                  onChange={(event) => setInputId(event.target.value || null)}
                  className={fieldClass}
                >
                  {inputs.map((input) => (
                    <option key={input.id} value={input.id}>
                      {input.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex h-10 items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={withChords}
                disabled={busy || preview.playing}
                onChange={(event) => setWithChords(event.target.checked)}
              />
              Con los acordes
            </label>
          </div>

          {accessMessage && !virtualOn && (
            <p role="status" className="text-xs text-slate-500 dark:text-slate-400">
              {accessMessage}
            </p>
          )}
        </div>

        <div className="h-[max(16rem,48vh)] px-4 py-3">
          <PianoRoll
            notes={busy ? [...events, ...liveEvents] : events}
            bpm={bpm}
            beatsPerBar={bpb}
            durationSeconds={lengthBeats * beat}
            progression={labels}
            getPlayhead={busy ? livePlayhead : preview.playing ? previewPlayhead : undefined}
            subdivision={gridStep}
            minRange={ROLL_RANGE[role]}
            drawMode={drawMode}
            onChangeNotes={busy ? undefined : changeEvents}
            onAudition={busy ? undefined : audition}
            selection={busy ? undefined : selection}
            onSelectionChange={busy ? undefined : setSelection}
          />
        </div>

        <div className="px-4 pb-4 space-y-2">
          <div role="toolbar" aria-label="Herramientas" className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawMode(!drawMode)}
              aria-pressed={drawMode}
              title="Lápiz: un toque en un hueco escribe una nota"
              className={cn(toolButtonClass, drawMode && 'bg-indigo-600 text-white hover:bg-indigo-600 dark:bg-indigo-600 dark:text-white')}
            >
              <Pencil className="w-4 h-4" aria-hidden />
              Lápiz
            </button>
            <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              <span className="sr-only">Rejilla</span>
              <select
                aria-label="Rejilla"
                value={gridStep}
                onChange={(event) => setGridStep(parseInt(event.target.value))}
                className="h-10 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm"
              >
                {GRID_STEPS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={quantize} disabled={busy || notes.length === 0} className={toolButtonClass}>
              <Magnet className="w-4 h-4" aria-hidden />
              {selection.length > 0 ? 'Cuantizar selección' : 'Cuantizar'}
            </button>
            {selection.length > 0 && !busy && (
              <>
                <button type="button" onClick={() => stretch(-1)} aria-label="Acortar la selección" className={toolButtonClass}>
                  <Minus className="w-4 h-4" aria-hidden />
                  Largo
                </button>
                <button type="button" onClick={() => stretch(1)} aria-label="Alargar la selección" className={toolButtonClass}>
                  <Plus className="w-4 h-4" aria-hidden />
                  Largo
                </button>
                <button type="button" onClick={deleteSelection} className={toolButtonClass}>
                  <Trash2 className="w-4 h-4" aria-hidden />
                  Borrar
                </button>
              </>
            )}
            <button type="button" onClick={() => setExtraBars(extraBars + 1)} disabled={busy} aria-label="Añadir un compás" className={toolButtonClass}>
              <Plus className="w-4 h-4" aria-hidden />
              Compás
            </button>
            <button type="button" onClick={undo} disabled={busy || history.length === 0} className={toolButtonClass}>
              <Undo2 className="w-4 h-4" aria-hidden />
              Deshacer
            </button>
            <button type="button" onClick={clearAll} disabled={busy || notes.length === 0} className={toolButtonClass}>
              <Eraser className="w-4 h-4" aria-hidden />
              Vaciar
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {drawMode
              ? 'Con el lápiz, un toque en un hueco escribe una nota de un paso de la rejilla; toca una nota para elegirla y usa Largo o Borrar.'
              : 'Doble clic escribe o borra una nota. Arrastra una nota para moverla y su borde derecho para estirarla.'}{' '}
            Grabar reemplaza lo que había desde el compás elegido hasta donde pares. Todo se guarda con la canción.
          </p>
        </div>
      </div>

      {virtualOn && (
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f36]">
          <VirtualKeyboard held={recorder.held} onNoteOn={recorder.noteOn} onNoteOff={recorder.noteOff} />
        </div>
      )}
    </section>
  )

  return typeof document === 'undefined' ? null : createPortal(dialog, document.body)
}
