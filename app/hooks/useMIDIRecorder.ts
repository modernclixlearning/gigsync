/**
 * useMIDIRecorder Hook
 *
 * Records what's played on a MIDI keyboard against GigSync's click: a count-in,
 * then a click until `stop()`. The clicks are scheduled on the audio clock and
 * every note is placed by the moment it was *heard* relative to them (same
 * MIDI → audio time mapping as the DAW clock sync), so the beat grid of the
 * recording is the click itself. While listening (recording or not) the keys
 * being held are reported and, optionally, played through a simple synth —
 * MIDI controllers like the MiniLab make no sound of their own.
 *
 * Drum pads (channel 10) are ignored. Does not touch Tone.Transport.
 *
 * The on-screen / computer keyboard plays through the same path as a MIDI
 * controller: `noteOn` / `noteOff` below stand in for its Note On / Note Off.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import { createAudioTimeMapper, type AudioClockLike } from '~/lib/midi/audioTime'
import { createKeysInstrument, type ChordInstrument } from '~/lib/audio/instruments'
import {
  createNoteRecorder,
  MIDI_DRUM_CHANNEL,
  parseMIDINoteMessage,
  type MIDINoteMessage,
  type NoteRecorder,
} from '~/lib/midi/notes'
import {
  beatSeconds,
  describeSounding,
  positionAt,
  recordingToProgression,
  type RecordingGrid,
} from '~/lib/midi/recording'
import { progressionToBarLines } from '~/lib/audioAnalysis/chordproOutput'
import type { ChordProgression, NoteEvent } from '~/lib/audioAnalysis/types'

const ACCENT_HZ = 1200
const NORMAL_HZ = 800
/** Small lead so the first click isn't scheduled in the past. */
const LEAD_SECONDS = 0.05
const SCHEDULE_AHEAD_SECONDS = 0.2
const SCHEDULER_INTERVAL_MS = 25

export type RecorderPhase = 'idle' | 'count-in' | 'recording' | 'done'

export interface MIDIRecording {
  notes: NoteEvent[]
  progression: ChordProgression
  /** Seconds from the first downbeat to Stop. */
  durationSeconds: number
  /** Tempo and meter of the click it was played against. */
  grid: RecordingGrid
}

/** The take in progress: notes so far (held ones end now) and the time heard now. */
export interface LiveTake {
  notes: NoteEvent[]
  /** Seconds from the first downbeat (negative during the count-in). */
  time: number
}

export interface UseMIDIRecorderOptions {
  access: MIDIAccess | null
  /** Input to listen to; null → not listening. */
  inputId: string | null
  bpm: number
  beatsPerBar: number
  countInBars?: number
  /** Play the keys through the browser while listening. */
  monitor?: boolean
  /** The instrument the keys are heard through. Default: the band's piano. */
  createMonitor?: () => ChordInstrument
  /** Changes when `createMonitor` would build a different instrument: the monitor is rebuilt. */
  monitorKey?: string
  /** Also record the drum pads (channel 10) — for recording the drums. Default: they are ignored. */
  acceptDrumChannel?: boolean
}

export interface UseMIDIRecorderReturn {
  phase: RecorderPhase
  /** Beat of the count-in bar (1-based) while counting in. */
  countIn: number | null
  /** Bar/beat of the click while recording. */
  position: { bar: number; beat: number } | null
  /** Chord (or notes) of the keys held right now. */
  sounding: string | null
  /** MIDI pitches held right now (from the controller or the virtual keyboard). */
  held: number[]
  /** A key pressed on a virtual keyboard (touch / computer keys). */
  noteOn: (pitch: number, velocity?: number) => void
  noteOff: (pitch: number) => void
  /** Progression so far, refreshed on every downbeat while recording. */
  liveLines: string[]
  /** Same, as the detected progression (for drawing chords over a piano roll). */
  liveProgression: ChordProgression | null
  recording: MIDIRecording | null
  /** The take in progress, or null when not recording. Cheap enough to poll. */
  peek: () => LiveTake | null
  start: () => Promise<void>
  stop: () => void
  reset: () => void
  /** Audio-clock time of the take's first downbeat (after the count-in), or null when not recording. */
  origin: () => number | null
}

interface Session {
  recorder: NoteRecorder
  /** Audio time of the first downbeat after the count-in. */
  origin: number
  nextBeat: number
  nextBeatIndex: number
  beat: number
  bpb: number
  countInBeats: number
  synth: Tone.Synth
  scheduler: ReturnType<typeof setInterval>
  timers: Set<ReturnType<typeof setTimeout>>
}

/** The native AudioContext: Tone's wrapper hides getOutputTimestamp/outputLatency. */
function audioClock(): AudioClockLike {
  const raw = Tone.getContext().rawContext as unknown as AudioClockLike & { _nativeAudioContext?: AudioClockLike }
  return raw._nativeAudioContext ?? raw
}

export function useMIDIRecorder({
  access,
  inputId,
  bpm,
  beatsPerBar,
  countInBars = 1,
  monitor = true,
  createMonitor,
  monitorKey,
  acceptDrumChannel = false,
}: UseMIDIRecorderOptions): UseMIDIRecorderReturn {
  const [phase, setPhase] = useState<RecorderPhase>('idle')
  const [countIn, setCountIn] = useState<number | null>(null)
  const [position, setPosition] = useState<{ bar: number; beat: number } | null>(null)
  const [sounding, setSounding] = useState<string | null>(null)
  const [held, setHeld] = useState<number[]>([])
  const [liveProgression, setLiveProgression] = useState<ChordProgression | null>(null)
  const liveLines = liveProgression ? progressionToBarLines(liveProgression) : []
  const [recording, setRecording] = useState<MIDIRecording | null>(null)

  const mapperRef = useRef(createAudioTimeMapper())
  /** Holds the keys while not recording, for the "sounding" display. */
  const idleRef = useRef<NoteRecorder>(createNoteRecorder())
  const sessionRef = useRef<Session | null>(null)
  const monitorSynthRef = useRef<ChordInstrument | null>(null)
  const monitorPlayingRef = useRef(new Set<number>())
  const gridRef = useRef({ bpm, beatsPerBar })
  gridRef.current = { bpm, beatsPerBar }

  /** Seconds from the first downbeat at which `timestampMs` was heard (idle: any monotonic clock). */
  const timeOf = useCallback((timestampMs: number): number => {
    const session = sessionRef.current
    if (!session) return timestampMs / 1000
    return mapperRef.current(timestampMs, audioClock()) - session.origin
  }, [])

  const activeRecorder = () => sessionRef.current?.recorder ?? idleRef.current

  const monitorRef = useRef(monitor)
  monitorRef.current = monitor

  // The monitor synth is created on the first key (no audio graph until then)
  // and freed when monitoring is switched off or the hook unmounts.
  useEffect(() => {
    if (monitor) return
    const instrument = monitorSynthRef.current
    monitorSynthRef.current = null
    monitorPlayingRef.current.clear()
    instrument?.synth.releaseAll()
    instrument?.dispose()
  }, [monitor])
  // Also freed when the instrument to monitor through changes: the next key builds the new one.
  useEffect(
    () => () => {
      monitorSynthRef.current?.dispose()
      monitorSynthRef.current = null
      monitorPlayingRef.current.clear()
    },
    [monitorKey],
  )
  const createMonitorRef = useRef(createMonitor)
  createMonitorRef.current = createMonitor

  /** Make the monitor follow the sounding keys; `struck` is re-attacked even if it was already sounding. */
  const syncMonitor = useCallback((sound: number[], struck?: { pitch: number; velocity: number }) => {
    if (!monitorRef.current) return
    if (!monitorSynthRef.current) {
      // The band's piano (recorded samples; a synth until they load), not reported as a band channel.
      const created = createMonitorRef.current?.() ?? createKeysInstrument('piano', { reportStatus: false })
      created.synth.volume.value = -4
      monitorSynthRef.current = created
    }
    const synth = monitorSynthRef.current.synth
    const playing = monitorPlayingRef.current
    if (Tone.getContext().state !== 'running') void Tone.start().catch(() => undefined)
    const now = Tone.immediate()
    const keep = new Set(sound)
    for (const pitch of [...playing]) {
      if (!keep.has(pitch) || pitch === struck?.pitch) {
        synth.triggerRelease([Tone.Frequency(pitch, 'midi').toFrequency()], now)
        playing.delete(pitch)
      }
    }
    if (struck) {
      synth.triggerAttack([Tone.Frequency(struck.pitch, 'midi').toFrequency()], now, struck.velocity / 127)
      playing.add(struck.pitch)
    }
  }, [])

  /** One note message heard at `timestampMs` (the DOM clock): a controller's or the virtual keyboard's. */
  const applyMessage = useCallback(
    (message: MIDINoteMessage, timestampMs: number) => {
      const time = timeOf(timestampMs)
      const recorder = activeRecorder()
      let struck: { pitch: number; velocity: number } | undefined
      if (message.type === 'note-on') {
        recorder.noteOn(message.pitch, message.velocity, time)
        struck = { pitch: message.pitch, velocity: message.velocity }
      } else if (message.type === 'note-off') {
        recorder.noteOff(message.pitch, time)
      } else {
        recorder.sustain(message.down, time)
      }
      const sound = recorder.sounding()
      syncMonitor(sound, struck)
      setSounding(describeSounding(sound))
      setHeld(sound)
    },
    [timeOf, syncMonitor],
  )

  const handleMessage = useCallback(
    (event: Event) => {
      const midiEvent = event as MIDIMessageEvent
      const message = parseMIDINoteMessage(midiEvent.data)
      if (!message || (message.channel === MIDI_DRUM_CHANNEL && !acceptDrumChannel)) return
      applyMessage(message, midiEvent.timeStamp || performance.now())
    },
    [applyMessage, acceptDrumChannel],
  )

  const noteOn = useCallback(
    (pitch: number, velocity = 90) =>
      applyMessage({ type: 'note-on', channel: 0, pitch, velocity: Math.min(127, Math.max(1, Math.round(velocity))) }, performance.now()),
    [applyMessage],
  )
  const noteOff = useCallback(
    (pitch: number) => applyMessage({ type: 'note-off', channel: 0, pitch }, performance.now()),
    [applyMessage],
  )

  useEffect(() => {
    if (!access || !inputId) return
    const input = access.inputs.get(inputId)
    if (!input) return
    input.addEventListener('midimessage', handleMessage)
    // addEventListener (unlike the onmidimessage setter) doesn't implicitly open the port.
    void input.open?.().catch(() => undefined)
    return () => {
      input.removeEventListener('midimessage', handleMessage)
      idleRef.current = createNoteRecorder()
      setSounding(null)
      setHeld([])
      monitorSynthRef.current?.synth.releaseAll()
      monitorPlayingRef.current.clear()
    }
  }, [access, inputId, handleMessage])

  const endSession = useCallback(() => {
    const session = sessionRef.current
    if (!session) return null
    sessionRef.current = null
    clearInterval(session.scheduler)
    session.timers.forEach(clearTimeout)
    // Let the last click ring out before freeing the synth.
    setTimeout(() => session.synth.dispose(), 300)
    return session
  }, [])

  const start = useCallback(async () => {
    endSession()
    if (Tone.getContext().state !== 'running') await Tone.start()

    const { bpm: tempo, beatsPerBar: perBar } = gridRef.current
    const bpb = Math.max(1, Math.round(perBar))
    const beat = beatSeconds(tempo)
    const countInBeats = Math.max(0, Math.round(countInBars)) * bpb
    const firstClick = Tone.now() + LEAD_SECONDS
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    }).toDestination()

    // Keys already held (e.g. the first chord during the count-in) carry over.
    const recorder = createNoteRecorder()
    const session: Session = {
      recorder,
      origin: firstClick + countInBeats * beat,
      nextBeat: firstClick,
      nextBeatIndex: -countInBeats,
      beat,
      bpb,
      countInBeats,
      synth,
      scheduler: 0 as unknown as ReturnType<typeof setInterval>,
      timers: new Set(),
    }
    const held = idleRef.current.sounding()
    idleRef.current = createNoteRecorder()
    for (const pitch of held) recorder.noteOn(pitch, 90, -countInBeats * beat)

    const schedule = () => {
      const context = Tone.getContext()
      while (session.nextBeat < context.currentTime + SCHEDULE_AHEAD_SECONDS) {
        const index = session.nextBeatIndex
        const at = session.nextBeat
        const downbeat = ((index % bpb) + bpb) % bpb === 0
        synth.triggerAttackRelease(downbeat ? ACCENT_HZ : NORMAL_HZ, '32n', at)
        const delay = Math.max(0, (at - context.currentTime) * 1000)
        const timer = setTimeout(() => {
            session.timers.delete(timer)
            if (sessionRef.current !== session) return
            if (index < 0) {
              setCountIn(((index + countInBeats) % bpb) + 1)
              return
            }
            if (index === 0) {
              setCountIn(null)
              setPhase('recording')
            }
            setPosition(positionAt(index * beat, { bpm: tempo, beatsPerBar: bpb }))
            if (downbeat && index > 0) {
              const now = index * beat
              setLiveProgression(recordingToProgression(recorder.notesUntil(now), now, { bpm: tempo, beatsPerBar: bpb }))
            }
          }, delay)
        session.timers.add(timer)
        session.nextBeatIndex += 1
        session.nextBeat += beat
      }
    }

    sessionRef.current = session
    setRecording(null)
    setLiveProgression(null)
    setPosition(null)
    setCountIn(null)
    setPhase(countInBeats > 0 ? 'count-in' : 'recording')
    schedule()
    session.scheduler = setInterval(schedule, SCHEDULER_INTERVAL_MS)
  }, [countInBars, endSession])

  const stop = useCallback(() => {
    const session = sessionRef.current
    if (!session) return
    const end = Math.max(0, timeOf(performance.now()))
    endSession()
    const held = session.recorder.sounding()
    const notes = session.recorder.finish(end)
    const grid = { bpm: 60 / session.beat, beatsPerBar: session.bpb }
    setRecording({ notes, progression: recordingToProgression(notes, end, grid), durationSeconds: end, grid })
    setCountIn(null)
    setPosition(null)
    setPhase('done')
    // Whatever is still held keeps sounding for the idle display, from now.
    for (const pitch of held) idleRef.current.noteOn(pitch, 90, performance.now() / 1000)
  }, [endSession, timeOf])

  const peek = useCallback((): LiveTake | null => {
    const session = sessionRef.current
    if (!session) return null
    const time = timeOf(performance.now())
    return { notes: session.recorder.notesUntil(Math.max(0, time)), time }
  }, [timeOf])

  const reset = useCallback(() => {
    endSession()
    setRecording(null)
    setLiveProgression(null)
    setCountIn(null)
    setPosition(null)
    setPhase('idle')
  }, [endSession])

  useEffect(() => () => void endSession(), [endSession])

  const origin = useCallback(() => sessionRef.current?.origin ?? null, [])

  return { origin, phase, countIn, position, sounding, held, noteOn, noteOff, liveLines, liveProgression, recording, peek, start, stop, reset }
}
