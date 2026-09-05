/**
 * LyricVerseLine / LyricVerseRow
 *
 * Read-only rendering of sung lyric lines as continuous verse text — reads
 * like a line of a poem, wrapping naturally. Chords are small floating
 * labels anchored above the character position they belong to; they never
 * break the line into cells/columns. Following the beat is a lighting
 * effect (opacity/glow), not a layout change — see the `[data-chord-index]`
 * highlight rules in SongPlayerContent.
 *
 * `LyricVerseRow` is the shared implementation: it can fuse several
 * consecutive ChordPro lines onto one visual row ("versos por línea" —
 * short rap-style lines pack several per row; a long aria line is one row
 * on its own). `LyricVerseLine` is the single-line convenience wrapper used
 * everywhere a single original line maps 1:1 to one row.
 *
 * A fused row never wraps to a second line — if it doesn't fit the viewport
 * width, it marquees: once it becomes the active row, it scrolls left at a
 * pace matching the row's own beat span (via a plain CSS transition, no
 * animation loop), revealing the rest instead of breaking the verse.
 */

import { useEffect, useRef } from 'react'
import { cn } from '~/lib/utils'
import { splitLineIntoSegments, type LyricParsedLine } from '~/lib/chordpro'
import { calculateElementDuration, type TimelineCalculationOptions } from '~/lib/timeline'

interface VerseEntry {
  line: LyricParsedLine
  elementId: string
}

interface LyricVerseRowProps {
  entries: VerseEntry[]
  className?: string
  onChordClick?: (elementId: string, chordIndex: number | null) => void
  isSeekEnabled?: boolean
  /** Currently playing element id — drives the marquee for this row when it matches one of `entries`. */
  currentElementId?: string | null
  /** Song tempo, used to time the marquee to the row's own beat span. */
  bpm?: number
  /** Time signature (e.g. "4/4") the marquee timing is computed against. */
  timeSignature?: string
}

// Same options the real autoscroll timeline was built with (see useSmartAutoScroll's
// calculationOptions in SongPlayerContent) — the marquee has to use the identical
// duration rule or it drifts out of sync with how long the row actually stays active.
const TIMELINE_OPTIONS: TimelineCalculationOptions = {
  defaultBarsPerLine: 2,
  defaultBeatsPerChord: 4,
  intelligentEstimation: false,
}

function totalBeats(entries: VerseEntry[], timeSignature: string): number {
  return entries.reduce(
    (sum, entry) => sum + calculateElementDuration(entry.line, TIMELINE_OPTIONS, timeSignature),
    0
  )
}

export function LyricVerseRow({
  entries,
  className,
  onChordClick,
  isSeekEnabled = false,
  currentElementId,
  bpm,
  timeSignature = '4/4',
}: LyricVerseRowProps) {
  const rowRef = useRef<HTMLParagraphElement>(null)
  const animRef = useRef<Animation | null>(null)

  const isActive = currentElementId != null && entries.some((e) => e.elementId === currentElementId)
  const beats = entries.length > 0 ? totalBeats(entries, timeSignature) : 0
  const durationSeconds = bpm && bpm > 0 ? (beats / bpm) * 60 : 0

  // Driven imperatively via the Web Animations API, started once per
  // active-window — NOT via a React `style` prop. SongPlayerContent
  // re-renders this row on every beat tick (for the chord-glow highlight),
  // and re-applying `transform`/`transition` through React's style diffing
  // on every one of those renders was interrupting/restarting a plain CSS
  // transition before it ever finished, so the marquee never reached the
  // end of the line. A WAAPI animation runs on the compositor, immune to
  // how often the component re-renders.
  useEffect(() => {
    const el = rowRef.current
    if (!el) return
    if (!isActive) {
      animRef.current?.cancel()
      animRef.current = null
      return
    }

    const overflow = Math.max(0, el.scrollWidth - el.clientWidth)
    if (overflow === 0 || durationSeconds <= 0) return

    animRef.current = el.animate(
      [{ transform: 'translateX(0px)' }, { transform: `translateX(-${overflow}px)` }],
      { duration: durationSeconds * 1000, easing: 'linear', fill: 'forwards' }
    )
    return () => {
      animRef.current?.cancel()
      animRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive])

  if (entries.length === 0) return null

  return (
    <p
      ref={rowRef}
      data-bar-element
      className={cn(
        'pt-[0.9em] leading-relaxed whitespace-nowrap overflow-hidden',
        'text-slate-900 dark:text-white font-semibold',
        className
      )}
    >
      {entries.map((entry, entryIndex) => {
        const segments = splitLineIntoSegments(entry.line)
        if (segments.length === 0) return null

        return (
          <span key={entry.elementId} data-element-id={entry.elementId}>
            {segments.map((seg, i) => (
              <span
                key={i}
                data-chord-index={i}
                role={isSeekEnabled ? 'button' : undefined}
                tabIndex={isSeekEnabled ? 0 : undefined}
                onClick={isSeekEnabled ? () => onChordClick?.(entry.elementId, i) : undefined}
                className={cn('relative', isSeekEnabled && 'cursor-pointer')}
              >
                {seg.chord && (
                  <span
                    aria-hidden
                    className="absolute -top-[0.9em] left-0 text-[0.4em] font-mono font-bold text-sky-400/70 leading-none select-none"
                  >
                    {seg.chord}
                  </span>
                )}
                {seg.text}
              </span>
            ))}
            {/* Several original verses sharing this row — a faint divider, not a border/box */}
            {entryIndex < entries.length - 1 && (
              <span aria-hidden className="mx-4 text-white/15 select-none">
                /
              </span>
            )}
          </span>
        )
      })}
    </p>
  )
}

interface LyricVerseLineProps {
  line: LyricParsedLine
  elementId: string
  className?: string
  onChordClick?: (elementId: string, chordIndex: number | null) => void
  isSeekEnabled?: boolean
  currentElementId?: string | null
  bpm?: number
  timeSignature?: string
}

export function LyricVerseLine({ line, elementId, ...rest }: LyricVerseLineProps) {
  return <LyricVerseRow entries={[{ line, elementId }]} {...rest} />
}
