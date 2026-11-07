import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '~/lib/utils'
import {
  DEFAULT_BASE_OCTAVE,
  MAX_BASE_OCTAVE,
  MIN_BASE_OCTAVE,
  clampBaseOctave,
  codeForPitch,
  codeLabel,
  noteName,
  octaveKeys,
  octaveStart,
  pitchForCode,
  velocityFromPosition,
} from '~/lib/midi/virtualKeys'

interface VirtualKeyboardProps {
  /** Pitches sounding right now (from any source): lit on the keys. */
  held: number[]
  onNoteOn: (pitch: number, velocity: number) => void
  onNoteOff: (pitch: number) => void
}

const KEYS = octaveKeys()

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  return el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.isContentEditable
}

/**
 * A touch piano for when there is no controller: two octaves, side by side on a
 * wide screen and one above the other on a phone, played with fingers (several
 * at once) or with the computer keys (Z row = lower octave, Q row = upper).
 */
export function VirtualKeyboard({ held, onNoteOn, onNoteOff }: VirtualKeyboardProps) {
  const [baseOctave, setBaseOctave] = useState(DEFAULT_BASE_OCTAVE)
  const baseRef = useRef(baseOctave)
  baseRef.current = baseOctave
  /** What each finger / computer key is holding, so that releasing ends the right note. */
  const pointers = useRef(new Map<number, number>())
  const codes = useRef(new Map<string, number>())
  const heldSet = new Set(held)

  const noteOnRef = useRef(onNoteOn)
  noteOnRef.current = onNoteOn
  const noteOffRef = useRef(onNoteOff)
  noteOffRef.current = onNoteOff

  const releaseAll = useCallback(() => {
    for (const pitch of new Set([...pointers.current.values(), ...codes.current.values()])) noteOffRef.current(pitch)
    pointers.current.clear()
    codes.current.clear()
  }, [])

  // Computer keys.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return
      if (event.code === 'Minus' || event.code === 'Equal') {
        releaseAll()
        setBaseOctave((o) => clampBaseOctave(o + (event.code === 'Equal' ? 1 : -1)))
        event.preventDefault()
        return
      }
      const pitch = pitchForCode(event.code, baseRef.current)
      if (pitch === null || codes.current.has(event.code)) return
      event.preventDefault()
      codes.current.set(event.code, pitch)
      noteOnRef.current(pitch, 90)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      const pitch = codes.current.get(event.code)
      if (pitch === undefined) return
      codes.current.delete(event.code)
      noteOffRef.current(pitch)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', releaseAll)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', releaseAll)
      releaseAll()
    }
  }, [releaseAll])

  const shiftOctave = (delta: number) => {
    releaseAll()
    setBaseOctave((o) => clampBaseOctave(o + delta))
  }

  const press = (pitch: number) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const velocity = velocityFromPosition(rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    pointers.current.set(event.pointerId, pitch)
    noteOnRef.current(pitch, velocity)
  }
  const release = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const pitch = pointers.current.get(event.pointerId)
    if (pitch === undefined) return
    pointers.current.delete(event.pointerId)
    noteOffRef.current(pitch)
  }

  const octave = (octaveNumber: number, name: string) => {
    const start = octaveStart(octaveNumber)
    const key = (semitone: number, black: boolean, position: number) => {
      const pitch = start + semitone
      const pressed = heldSet.has(pitch)
      const hint = codeForPitch(pitch, baseOctave)
      return (
        <button
          key={semitone}
          type="button"
          aria-label={noteName(pitch)}
          aria-pressed={pressed}
          onPointerDown={press(pitch)}
          onPointerUp={release}
          onPointerCancel={release}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
              e.preventDefault()
              noteOnRef.current(pitch, 90)
            }
          }}
          onKeyUp={(e) => {
            if (e.key === ' ' || e.key === 'Enter') noteOffRef.current(pitch)
          }}
          style={black ? { left: `${position}%` } : { left: `${position}%`, width: `${100 / 7}%` }}
          className={cn(
            'absolute touch-none select-none flex flex-col justify-end items-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500',
            black
              ? 'z-10 top-0 h-[62%] w-[9%] -translate-x-1/2 rounded-b-md border border-black'
              : 'bottom-0 top-0 rounded-b-lg border border-slate-400 dark:border-slate-500',
            black
              ? pressed
                ? 'bg-indigo-500'
                : 'bg-slate-900 hover:bg-slate-800'
              : pressed
                ? 'bg-indigo-200'
                : 'bg-white hover:bg-slate-100'
          )}
        >
          {hint && (
            <span
              aria-hidden
              className={cn('hidden md:block mb-1 text-[10px] font-semibold', black ? 'text-slate-300' : 'text-slate-400')}
            >
              {codeLabel(hint)}
            </span>
          )}
          {!black && semitone === 0 && (
            <span aria-hidden className="mb-1 text-xs font-medium text-slate-500">
              {noteName(pitch)}
            </span>
          )}
        </button>
      )
    }
    return (
      <div key={name} role="group" aria-label={`Octava ${octaveNumber}`} className="relative h-28 md:h-36 md:flex-1">
        {KEYS.whites.map((k) => key(k.semitone, false, k.position))}
        {KEYS.blacks.map((k) => key(k.semitone, true, k.position))}
      </div>
    )
  }

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => shiftOctave(-1)}
            disabled={baseOctave <= MIN_BASE_OCTAVE}
            aria-label="Octava más grave"
            className="p-2 rounded-full disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-1 text-sm font-semibold tabular-nums" aria-live="polite">
            Oct {baseOctave}
          </span>
          <button
            type="button"
            onClick={() => shiftOctave(1)}
            disabled={baseOctave >= MAX_BASE_OCTAVE}
            aria-label="Octava más aguda"
            className="p-2 rounded-full disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400">
          Teclas del ordenador: fila Z–M octava grave, fila Q–U octava aguda · <kbd>-</kbd> <kbd>=</kbd> cambian de octava
        </p>
      </div>
      {/* Lower octave first: left on a wide screen; at the bottom on a phone (upper one on top). */}
      <div className="flex flex-col-reverse md:flex-row gap-3">
        {octave(baseOctave, 'lower')}
        {octave(baseOctave + 1, 'upper')}
      </div>
    </div>
  )
}
