/**
 * The tempo as a round knob, the same size as the tuner's dial. Turn the ring
 * to set the BPM (drag it, or use the arrow keys); tap the centre to tap the
 * tempo. The tempo you tap is applied as you go, from the second tap.
 */

import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { motion } from 'framer-motion'
import { cn } from '~/lib/utils'
import { useTapTempo } from '~/hooks/useTapTempo'

export interface TempoKnobProps {
  value: number
  min?: number
  max?: number
  onChange: (bpm: number) => void
  /** Whether the metronome is running (the centre glows). */
  isPlaying?: boolean
  /** Same sizes as the tuner's dial. */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = { sm: 200, md: 280, lg: 360 } as const

/** The knob turns 270°: from 135° to the left of straight up, to 135° to the right. */
export const KNOB_SWEEP_DEGREES = 270
const HALF_SWEEP = KNOB_SWEEP_DEGREES / 2

/** Angle (degrees, 0 = up, clockwise) of a tempo on the knob. */
export function bpmToAngle(bpm: number, min = 20, max = 300): number {
  const fraction = (Math.min(max, Math.max(min, bpm)) - min) / (max - min)
  return -HALF_SWEEP + fraction * KNOB_SWEEP_DEGREES
}

/** The tempo at an angle; the dead zone at the bottom sticks to the nearer end. */
export function angleToBpm(angle: number, min = 20, max = 300): number {
  const clamped = Math.max(-HALF_SWEEP, Math.min(HALF_SWEEP, angle))
  return Math.round(min + ((clamped + HALF_SWEEP) / KNOB_SWEEP_DEGREES) * (max - min))
}

/** Angle (degrees, 0 = up, clockwise) of a point seen from the centre. */
export function pointAngle(dx: number, dy: number): number {
  return (Math.atan2(dx, -dy) * 180) / Math.PI
}

/** The classical name of a tempo. */
export function tempoName(bpm: number): string {
  if (bpm < 40) return 'Grave'
  if (bpm < 60) return 'Largo'
  if (bpm < 66) return 'Larghetto'
  if (bpm < 76) return 'Adagio'
  if (bpm < 108) return 'Andante'
  if (bpm < 120) return 'Moderato'
  if (bpm < 156) return 'Allegro'
  if (bpm < 176) return 'Vivace'
  if (bpm < 200) return 'Presto'
  return 'Prestissimo'
}

const polar = (center: number, radius: number, angle: number) => {
  const radian = ((angle - 90) * Math.PI) / 180
  return { x: center + radius * Math.cos(radian), y: center + radius * Math.sin(radian) }
}

/** SVG arc from angle `from` to angle `to` (clockwise). */
function arc(center: number, radius: number, from: number, to: number): string {
  const start = polar(center, radius, from)
  const end = polar(center, radius, to)
  const large = to - from > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`
}

export function TempoKnob({ value, min = 20, max = 300, onChange, isPlaying = false, size = 'md', className }: TempoKnobProps) {
  const diameter = SIZES[size]
  const center = diameter / 2
  const ringRadius = center - 22
  const centerButton = Math.round(diameter * 0.56)
  const angle = bpmToAngle(value, min, max)
  const thumb = polar(center, ringRadius, angle)

  const ringRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<number | null>(null)

  const clamp = (bpm: number) => Math.max(min, Math.min(max, Math.round(bpm)))

  const setFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = ringRef.current?.getBoundingClientRect()
    if (!box) return
    const dx = event.clientX - (box.left + box.width / 2)
    const dy = event.clientY - (box.top + box.height / 2)
    onChange(angleToBpm(pointAngle(dx, dy), min, max))
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    draggingRef.current = event.pointerId
    try {
      ringRef.current?.setPointerCapture?.(event.pointerId)
    } catch {
      // The pointer is already gone (or never was one): the drag still works without the capture.
    }
    ringRef.current?.focus({ preventScroll: true })
    setFromPointer(event)
  }
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current !== event.pointerId) return
    setFromPointer(event)
  }
  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current !== event.pointerId) return
    draggingRef.current = null
    try {
      ringRef.current?.releasePointerCapture?.(event.pointerId)
    } catch {
      // Nothing was captured.
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 1
    const moves: Record<string, number> = {
      ArrowUp: step,
      ArrowRight: step,
      ArrowDown: -step,
      ArrowLeft: -step,
      PageUp: 10,
      PageDown: -10,
    }
    if (event.key in moves) {
      event.preventDefault()
      onChange(clamp(value + moves[event.key]))
    } else if (event.key === 'Home') {
      event.preventDefault()
      onChange(min)
    } else if (event.key === 'End') {
      event.preventDefault()
      onChange(max)
    }
  }

  // Tap tempo from the centre: the tempo tapped so far is applied as you go.
  const { tap, calculatedBpm, taps } = useTapTempo()
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  useEffect(() => {
    if (calculatedBpm) onChangeRef.current(clamp(calculatedBpm))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatedBpm])

  const ticks = Array.from({ length: 15 }, (_, i) => min + ((max - min) / 14) * i)

  return (
    <div className={cn('relative select-none', className)} style={{ width: diameter, height: diameter }}>
      <svg width={diameter} height={diameter} className="absolute inset-0" aria-hidden>
        {/* Track and the part of it that is set */}
        <path d={arc(center, ringRadius, -HALF_SWEEP, HALF_SWEEP)} fill="none" strokeWidth={10} strokeLinecap="round" className="stroke-slate-200 dark:stroke-slate-700" />
        <path d={arc(center, ringRadius, -HALF_SWEEP, Math.max(-HALF_SWEEP + 0.01, angle))} fill="none" strokeWidth={10} strokeLinecap="round" className="stroke-primary" />
        {/* Ticks */}
        {ticks.map((tick, i) => {
          const a = bpmToAngle(tick, min, max)
          const outer = polar(center, ringRadius + 12, a)
          const inner = polar(center, ringRadius + (i % 2 === 0 ? 20 : 16), a)
          return <line key={i} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} strokeWidth={2} className="stroke-slate-300 dark:stroke-slate-600" />
        })}
        {/* Thumb */}
        <circle cx={thumb.x} cy={thumb.y} r={13} className="fill-white stroke-primary" strokeWidth={4} />
      </svg>

      {/* The ring: turn it */}
      <div
        ref={ringRef}
        role="slider"
        tabIndex={0}
        aria-label="Tempo"
        aria-orientation="horizontal"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} BPM, ${tempoName(value)}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className="absolute inset-0 cursor-grab touch-none rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing"
      />

      {/* The centre: tap it to tap the tempo */}
      <motion.button
        type="button"
        onClick={tap}
        whileTap={{ scale: 0.96 }}
        aria-label="Marcar el tempo con toques"
        title="Toca al ritmo para fijar el tempo"
        className={cn(
          'absolute flex flex-col items-center justify-center rounded-full',
          'bg-slate-100 dark:bg-[#232948] text-slate-900 dark:text-white',
          'hover:bg-slate-200 dark:hover:bg-[#2d3454] transition-colors',
          isPlaying && 'ring-2 ring-primary/40'
        )}
        style={{ width: centerButton, height: centerButton, left: (diameter - centerButton) / 2, top: (diameter - centerButton) / 2 }}
      >
        <span className="text-5xl font-bold leading-none tabular-nums" aria-live="off">
          {value}
        </span>
        <span className="mt-1 text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">BPM</span>
        <span className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          {taps.length === 0 ? tempoName(value) : calculatedBpm ? 'marcando…' : 'sigue el pulso…'}
        </span>
      </motion.button>
    </div>
  )
}
