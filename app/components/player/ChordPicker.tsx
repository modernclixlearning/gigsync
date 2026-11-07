/**
 * ChordPicker Component
 *
 * A tablet-friendly chord selector: the circle of fifths for the root (major
 * keys on the outer ring, their relative minors inside — clockwise goes up a
 * fifth, counter-clockwise up a fourth) plus a grid of qualities.
 * Appears as a popover near the tapped chord cell.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '~/lib/utils'

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const ROOTS_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

const QUALITIES = [
  { label: 'maj', suffix: '' },
  { label: 'min', suffix: 'm' },
  { label: '7', suffix: '7' },
  { label: 'maj7', suffix: 'maj7' },
  { label: 'm7', suffix: 'm7' },
  { label: 'sus2', suffix: 'sus2' },
  { label: 'sus4', suffix: 'sus4' },
  { label: 'dim', suffix: 'dim' },
  { label: 'm7b5', suffix: 'm7b5' },
  { label: 'aug', suffix: 'aug' },
  { label: 'add9', suffix: 'add9' },
  { label: '9', suffix: '9' },
  { label: '6', suffix: '6' },
] as const

/** Pitch classes around the circle, clockwise from the top: C G D A E B F♯ D♭ A♭ E♭ B♭ F. */
const FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5] as const

/** Minor-family suffixes (m, m7, m7b5, dim…): they live on the inner ring. */
export function isMinorSuffix(suffix: string): boolean {
  return /^(m(?!aj)|dim)/.test(suffix)
}

function pitchClassOf(root: string): number {
  const sharp = ROOTS.indexOf(root as (typeof ROOTS)[number])
  return sharp >= 0 ? sharp : ROOTS_FLAT.indexOf(root as (typeof ROOTS_FLAT)[number])
}

const SIZE = 240
const CENTER = SIZE / 2
const point = (radius: number, degrees: number) => {
  const a = (degrees * Math.PI) / 180
  return { x: CENTER + radius * Math.sin(a), y: CENTER - radius * Math.cos(a) }
}

/** Ring sector between two radii, centered on `degrees` and 30° wide. */
function sectorPath(outer: number, inner: number, degrees: number): string {
  const a0 = degrees - 15
  const a1 = degrees + 15
  const o0 = point(outer, a0)
  const o1 = point(outer, a1)
  const i1 = point(inner, a1)
  const i0 = point(inner, a0)
  return `M${o0.x},${o0.y} A${outer},${outer} 0 0 1 ${o1.x},${o1.y} L${i1.x},${i1.y} A${inner},${inner} 0 0 0 ${i0.x},${i0.y} Z`
}

interface CircleOfFifthsProps {
  names: readonly string[]
  /** Selected root's pitch class (-1 = none) and whether the selected chord is minor. */
  selectedPitchClass: number
  selectedMinor: boolean
  preview: string
  onPick: (pitchClass: number, minor: boolean) => void
}

function CircleOfFifths({ names, selectedPitchClass, selectedMinor, preview, onPick }: CircleOfFifthsProps) {
  const ring = (minor: boolean, outer: number, inner: number, labelRadius: number, fontSize: number) =>
    FIFTHS.map((majorPc, i) => {
      const pc = minor ? (majorPc + 9) % 12 : majorPc
      const label = names[pc] + (minor ? 'm' : '')
      const selected = pc === selectedPitchClass && minor === selectedMinor
      const center = point(labelRadius, i * 30)
      return (
        <g
          key={`${minor ? 'm' : 'M'}-${pc}`}
          role="button"
          tabIndex={0}
          aria-label={label}
          aria-pressed={selected}
          onClick={() => onPick(pc, minor)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onPick(pc, minor)
            }
          }}
          className="cursor-pointer outline-none group"
        >
          <path
            d={sectorPath(outer, inner, i * 30)}
            strokeWidth={2}
            className={cn(
              'stroke-white dark:stroke-slate-800 transition-colors',
              selected
                ? minor
                  ? 'fill-amber-500'
                  : 'fill-indigo-600'
                : minor
                  ? 'fill-slate-100 dark:fill-slate-700/70 group-hover:fill-amber-100 dark:group-hover:fill-amber-900/40'
                  : 'fill-slate-200 dark:fill-slate-700 group-hover:fill-indigo-100 dark:group-hover:fill-indigo-900/40',
              'group-focus-visible:stroke-indigo-500'
            )}
          />
          <text
            x={center.x}
            y={center.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={fontSize}
            className={cn(
              'font-mono font-bold pointer-events-none',
              selected ? 'fill-white' : 'fill-slate-800 dark:fill-slate-100'
            )}
          >
            {label}
          </text>
        </g>
      )
    })

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} className="mx-auto block" role="group" aria-label="Círculo de quintas">
      {ring(false, 118, 82, 100, 15)}
      {ring(true, 80, 48, 64, 12)}
      <text
        x={CENTER}
        y={CENTER}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={preview.length > 4 ? 16 : 22}
        className="font-mono font-bold fill-indigo-600 dark:fill-indigo-400 pointer-events-none"
      >
        {preview}
      </text>
    </svg>
  )
}

interface ChordPickerProps {
  currentChord: string
  onSelect: (chord: string) => void
  onClose: () => void
}

/** Parse current chord into root + suffix for initial selection */
function parseCurrentChord(chord: string): { root: string; suffix: string } {
  const match = chord.match(/^([A-G][#b]?)(.*)$/)
  if (!match) return { root: 'C', suffix: '' }
  return { root: match[1], suffix: match[2] }
}

export function ChordPicker({ currentChord, onSelect, onClose }: ChordPickerProps) {
  const parsed = parseCurrentChord(currentChord)
  const [root, setRoot] = useState(parsed.root)
  const [suffix, setSuffix] = useState(parsed.suffix)
  const [useFlats, setUseFlats] = useState(parsed.root.includes('b'))
  const containerRef = useRef<HTMLDivElement>(null)

  const roots = useFlats ? ROOTS_FLAT : ROOTS

  // Opened near the bottom of the screen, the picker would hide behind the controls bar.
  useEffect(() => {
    containerRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [])

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to avoid the same click that opened this
    const timer = setTimeout(() => document.addEventListener('pointerdown', handleClick), 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', handleClick)
    }
  }, [onClose])

  // Picking the root only updates the preview: the callers close the picker
  // on onSelect, so applying here would close it before the quality is chosen.
  // The quality applies the chord; "Aplicar" keeps the current quality.
  // Outer ring = major family, inner ring = minor family. A suffix that already
  // belongs to the family (7, maj7 / m7, m7b5…) is kept; otherwise it becomes the triad.
  const handlePick = useCallback(
    (pitchClass: number, minor: boolean) => {
      setRoot(roots[pitchClass])
      setSuffix((current) => (isMinorSuffix(current) === minor ? current : minor ? 'm' : ''))
    },
    [roots]
  )

  const handleSuffixSelect = useCallback(
    (s: string) => {
      setSuffix(s)
      onSelect(root + s)
    },
    [root, onSelect]
  )

  const currentChordPreview = root + suffix

  return (
    <div
      ref={containerRef}
      className={cn(
        'bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700',
        'p-3 w-[280px] select-none z-50'
      )}
      style={{ scrollMarginBottom: 112 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Sharps/flats, apply, close */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setUseFlats(!useFlats)}
          className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
        >
          {useFlats ? '♭→♯' : '♯→♭'}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelect(currentChordPreview)}
            className="text-xs px-2 py-1 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-500"
          >
            Aplicar
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Root: circle of fifths. Picking only updates the preview (see handleRootSelect). */}
      <CircleOfFifths
        names={roots}
        selectedPitchClass={pitchClassOf(root)}
        selectedMinor={isMinorSuffix(suffix)}
        preview={currentChordPreview || 'C'}
        onPick={handlePick}
      />

      {/* Separator */}
      <div className="border-t border-slate-200 dark:border-slate-700 my-2" />

      {/* Qualities */}
      <div className="grid grid-cols-5 gap-1">
        {QUALITIES.map((q) => (
          <button
            key={q.suffix}
            onClick={() => handleSuffixSelect(q.suffix)}
            className={cn(
              'py-2 rounded-lg text-xs font-semibold transition-colors',
              'min-h-[34px]',
              q.suffix === suffix
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-900/30'
            )}
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  )
}
