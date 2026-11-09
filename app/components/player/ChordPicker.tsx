/**
 * ChordPicker Component
 *
 * Chord selector: the circle of fifths for the root (major keys on the outer
 * ring, their relative minors inside — clockwise goes up a fifth,
 * counter-clockwise up a fourth) plus a grid of qualities.
 * A popover next to the tapped chord cell from `sm:` up; a bottom sheet on
 * phones, where a 300px popover never fits next to the cell.
 */

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '~/lib/utils'
import { previewChord } from '~/lib/audio/previewChord'

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
          {/* One selection color for the whole picker; the rings differ only in tone. */}
          <path
            d={sectorPath(outer, inner, i * 30)}
            strokeWidth={2}
            className={cn(
              'stroke-white dark:stroke-slate-800 transition-colors',
              selected
                ? 'fill-indigo-600'
                : minor
                  ? 'fill-slate-100 dark:fill-slate-700/60 group-hover:fill-indigo-100 dark:group-hover:fill-indigo-900/40'
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
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto block h-auto w-full max-w-[300px]"
      role="group"
      aria-label="Círculo de quintas"
    >
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

const PHONE_QUERY = '(max-width: 639px)'

/** Phones get the bottom sheet. Decided once on open — the picker is short-lived. */
function isPhoneViewport(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches
}

export function ChordPicker({ currentChord, onSelect, onClose }: ChordPickerProps) {
  const parsed = parseCurrentChord(currentChord)
  const [root, setRoot] = useState(parsed.root)
  const [suffix, setSuffix] = useState(parsed.suffix)
  const [useFlats, setUseFlats] = useState(parsed.root.includes('b'))
  const [isSheet] = useState(isPhoneViewport)
  const containerRef = useRef<HTMLDivElement>(null)

  const roots = useFlats ? ROOTS_FLAT : ROOTS

  // Popover: keep it on screen. Opened next to a cell near the right edge it
  // would run off the viewport, and near the bottom it would hide behind the
  // controls bar.
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el || isSheet) return
    const overflowRight = el.getBoundingClientRect().right - (window.innerWidth - 8)
    if (overflowRight > 0) el.style.transform = `translateX(${-overflowRight}px)`
    el.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [isSheet])

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
      const nextSuffix = isMinorSuffix(suffix) === minor ? suffix : minor ? 'm' : ''
      setSuffix(nextSuffix)
      void previewChord(roots[pitchClass] + nextSuffix)
    },
    [roots, suffix]
  )

  const handleSuffixSelect = useCallback(
    (s: string) => {
      setSuffix(s)
      void previewChord(root + s)
      onSelect(root + s)
    },
    [root, onSelect]
  )

  const currentChordPreview = root + suffix

  const picker = (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Elegir acorde"
      className={cn(
        'bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 select-none z-50',
        isSheet
          ? 'fixed inset-x-0 bottom-0 rounded-t-2xl px-4 pt-3 pb-4 safe-area-pb'
          : 'w-[296px] rounded-2xl p-3'
      )}
      style={isSheet ? undefined : { scrollMarginBottom: 112 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Title, sharps/flats, close */}
      <div className="mb-2 flex items-center gap-2">
        <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">Acorde</span>
        <button
          type="button"
          onClick={() => setUseFlats(!useFlats)}
          aria-label={useFlats ? '♭→♯' : '♯→♭'}
          title={useFlats ? 'Escribir con sostenidos' : 'Escribir con bemoles'}
          className="flex h-9 items-center gap-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 p-1 text-sm font-bold"
        >
          {(['♯', '♭'] as const).map((sign, i) => (
            <span
              key={sign}
              aria-hidden="true"
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md',
                (i === 1) === useFlats
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            >
              {sign}
            </span>
          ))}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Root: circle of fifths. Picking only updates the preview (see handlePick). */}
      <CircleOfFifths
        names={roots}
        selectedPitchClass={pitchClassOf(root)}
        selectedMinor={isMinorSuffix(suffix)}
        preview={currentChordPreview || 'C'}
        onPick={handlePick}
      />

      {/* Qualities: five per row, the last row centered */}
      <div className="mt-3 flex flex-wrap justify-center gap-1.5 border-t border-slate-200 dark:border-slate-700 pt-3">
        {QUALITIES.map((q) => (
          <button
            key={q.suffix}
            type="button"
            onClick={() => handleSuffixSelect(q.suffix)}
            aria-pressed={q.suffix === suffix}
            className={cn(
              'w-[calc((100%-1.5rem)/5)] rounded-lg text-xs font-semibold transition-colors',
              isSheet ? 'h-11 text-sm' : 'h-9',
              q.suffix === suffix
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
            )}
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Apply: keeps the current quality on the chosen root, and you're done.
          (A quality applies too but leaves the picker open, to keep trying chords.) */}
      <button
        type="button"
        onClick={() => {
          onSelect(currentChordPreview)
          onClose()
        }}
        className={cn(
          'mt-3 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500',
          isSheet ? 'h-12' : 'h-10'
        )}
      >
        Aplicar
      </button>
    </div>
  )

  if (!isSheet) return picker

  // Phone: bottom sheet over a dimmed song. In a portal so no ancestor's
  // overflow or transform clips it or re-anchors `fixed`.
  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" />
      {picker}
    </>,
    document.body
  )
}
