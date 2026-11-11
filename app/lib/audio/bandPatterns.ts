/**
 * The band's patterns of ONE song (pure): the drum pattern written for it and
 * the rhythm the bass and the chords are played with. The song still decides
 * the tempo, the meter and the chords; a pattern only says *when* each part
 * sounds inside the bar.
 *
 * A pattern is a string, one character per 16th note:
 *   `.` rest · `o` soft · `x` normal · `X` accent
 * — short, readable in an exported .gigsync and easy to compare on import.
 */

import type { ChordEvent } from '~/lib/timeline/chordEvents'
import { DRUM_PATTERN_DEFS, STEPS_PER_BEAT, type DrumPart, type DrumPattern, type DrumPatternDef } from './bandSound'

export const STEP_CHARS = ['.', 'o', 'x', 'X'] as const
export type StepChar = (typeof STEP_CHARS)[number]

const STEP_VELOCITY: Record<StepChar, number> = { '.': 0, o: 0.45, x: 0.7, X: 1 }

/** Longest pattern kept: two bars of a 4/4… or of anything up to 8 beats a bar. */
export const MAX_PATTERN_STEPS = 64

export const DRUM_PARTS: readonly DrumPart[] = ['hat', 'snare', 'kick']

/** The drum pattern of a song: one lane per part, all the same length. */
export type SongDrumPattern = Record<DrumPart, string>

/** What a song says about its band. Everything unset = the band plays as set in Ajustes. */
export interface SongBand {
  /** Drum pattern written for this song. Unset = the pattern chosen in the Sonido tab. */
  drums?: SongDrumPattern
  /** Rhythm of the bass, one bar. Unset = one long note per chord. */
  bassRhythm?: string
  /** Rhythm of the chords, one bar. Unset = one long chord per chord change. */
  chordRhythm?: string
}

const isStepChar = (c: string): c is StepChar => (STEP_CHARS as readonly string[]).includes(c)

/** A pattern as stored → clean: unknown characters rest, never longer than the maximum. */
export function cleanPattern(pattern: string | undefined | null): string {
  return [...(pattern ?? '')]
    .filter((c) => !/\s/.test(c))
    .slice(0, MAX_PATTERN_STEPS)
    .map((c) => (isStepChar(c) ? c : '.'))
    .join('')
}

/** Velocity (0–1) of each step. */
export function patternVelocities(pattern: string | undefined | null): number[] {
  return [...cleanPattern(pattern)].map((c) => STEP_VELOCITY[c as StepChar])
}

/** The closest pattern character to a velocity (for the built-in drum templates). */
function velocityChar(velocity: number): StepChar {
  if (velocity <= 0) return '.'
  if (velocity < 0.6) return 'o'
  return velocity < 0.9 ? 'x' : 'X'
}

/** True when the pattern has at least one hit. */
export function patternHasHits(pattern: string | undefined | null): boolean {
  return /[oxX]/.test(cleanPattern(pattern))
}

/** `pattern` at exactly `length` steps: cut, or filled with rests. */
export function fitPattern(pattern: string | undefined | null, length: number): string {
  return cleanPattern(pattern).slice(0, length).padEnd(length, '.')
}

/** The next state of a step when it is tapped: rest → normal → accent → rest (soft goes to rest). */
export function nextStepChar(current: string): StepChar {
  if (current === '.') return 'x'
  if (current === 'x') return 'X'
  return '.'
}

/** `pattern` with the step at `index` tapped. */
export function toggleStep(pattern: string, index: number): string {
  if (index < 0 || index >= pattern.length) return pattern
  return pattern.slice(0, index) + nextStepChar(pattern[index]) + pattern.slice(index + 1)
}

/** 16th-note steps in a bar. */
export function stepsPerBar(beatsPerBar: number): number {
  return Math.max(1, Math.round(beatsPerBar)) * STEPS_PER_BEAT
}

/* ── Drums ───────────────────────────────────────────────────────────────── */

/** One of the built-in rhythms as a song pattern, to start writing from. */
export function drumTemplate(pattern: DrumPattern): SongDrumPattern {
  const def = DRUM_PATTERN_DEFS[pattern]
  const lane = (part: DrumPart) => def[part].map(velocityChar).join('')
  return { kick: lane('kick'), snare: lane('snare'), hat: lane('hat') }
}

/** A song's drum pattern with every lane clean and `length` steps long (default: the longest lane). */
export function cleanDrumPattern(drums: Partial<SongDrumPattern> | undefined | null, length?: number): SongDrumPattern {
  const lanes = DRUM_PARTS.map((part) => cleanPattern(drums?.[part]))
  const steps = length ?? Math.max(STEPS_PER_BEAT, ...lanes.map((lane) => lane.length))
  return {
    kick: fitPattern(drums?.kick, steps),
    snare: fitPattern(drums?.snare, steps),
    hat: fitPattern(drums?.hat, steps),
  }
}

/** The lanes the drum machine plays: the song's own pattern, or the built-in one. */
export function resolveDrumLanes(drums: SongDrumPattern | undefined | null, fallback: DrumPattern): DrumPatternDef {
  if (!drums || !DRUM_PARTS.some((part) => patternHasHits(drums[part]))) return DRUM_PATTERN_DEFS[fallback]
  const clean = cleanDrumPattern(drums)
  return {
    kick: patternVelocities(clean.kick),
    snare: patternVelocities(clean.snare),
    hat: patternVelocities(clean.hat),
  }
}

/* ── Bass and chords ─────────────────────────────────────────────────────── */

export interface RhythmPreset {
  id: string
  label: string
  /** One bar of 4/4. Empty = no rhythm: one long note per chord. */
  pattern: string
}

export const SUSTAINED: RhythmPreset = { id: 'sustained', label: 'Nota larga', pattern: '' }

export const BASS_RHYTHM_PRESETS: readonly RhythmPreset[] = [
  SUSTAINED,
  { id: 'halves', label: 'Blancas', pattern: 'X.......x.......' },
  { id: 'quarters', label: 'Negras', pattern: 'X...x...x...x...' },
  { id: 'eighths', label: 'Corcheas', pattern: 'X.x.x.x.X.x.x.x.' },
  { id: 'pop', label: 'Pop', pattern: 'X.....x.X.......' },
  { id: 'bossa', label: 'Bossa', pattern: 'X.....x.X.....x.' },
]

export const CHORD_RHYTHM_PRESETS: readonly RhythmPreset[] = [
  { ...SUSTAINED, label: 'Acorde largo' },
  { id: 'halves', label: 'Blancas', pattern: 'X.......x.......' },
  { id: 'quarters', label: 'Negras', pattern: 'X...x...x...x...' },
  { id: 'eighths', label: 'Corcheas', pattern: 'X.x.x.x.x.x.x.x.' },
  { id: 'offbeat', label: 'Contratiempo', pattern: '..x...x...x...x.' },
  { id: 'bossa', label: 'Bossa', pattern: 'x..x..x...x..x..' },
]

/** One note (or chord) to play: which chord, when, for how long and how hard. */
export interface RhythmHit {
  chord: string
  startBeat: number
  durationBeats: number
  /** 0–1 */
  velocity: number
}

/** Velocity of a sustained chord, when no rhythm is written. */
export const SUSTAINED_VELOCITY = 0.7

/**
 * The chords of the song played with a rhythm: one hit per step of the pattern
 * that falls inside each chord, lasting until the next hit (or the end of the
 * chord). The pattern restarts every bar. A chord too short to catch any step
 * still sounds once, on its first beat — no chord of the song is skipped.
 * Without a rhythm, every chord is one long hit.
 */
export function rhythmHits(events: ChordEvent[], rhythm: string | undefined | null, beatsPerBar: number): RhythmHit[] {
  const velocities = patternVelocities(rhythm)
  if (!velocities.some((v) => v > 0)) {
    return events.map((event) => ({ ...event, velocity: SUSTAINED_VELOCITY }))
  }
  const perBar = stepsPerBar(beatsPerBar)
  const hits: RhythmHit[] = []
  for (const event of events) {
    const end = event.startBeat + event.durationBeats
    // `+ 0`: a chord on beat 0 would otherwise start on step -0.
    const firstStep = Math.ceil(event.startBeat * STEPS_PER_BEAT - 1e-6) + 0
    const lastStep = Math.ceil(end * STEPS_PER_BEAT - 1e-6)
    const starts: { beat: number; velocity: number }[] = []
    for (let step = firstStep; step < lastStep; step++) {
      const velocity = velocities[(((step % perBar) + perBar) % perBar) % velocities.length] ?? 0
      if (velocity > 0) starts.push({ beat: step / STEPS_PER_BEAT, velocity })
    }
    if (starts.length === 0) starts.push({ beat: event.startBeat, velocity: SUSTAINED_VELOCITY })
    starts.forEach((start, i) => {
      const next = starts[i + 1]?.beat ?? end
      hits.push({ chord: event.chord, startBeat: start.beat, durationBeats: Math.max(0, next - start.beat), velocity: start.velocity })
    })
  }
  return hits
}

/** The preset a stored rhythm matches, if any (to mark it in the editor). */
export function matchingPreset(presets: readonly RhythmPreset[], rhythm: string | undefined | null, steps: number): RhythmPreset | undefined {
  if (!patternHasHits(rhythm)) return presets.find((preset) => preset.pattern === '')
  const current = fitPattern(rhythm, steps)
  return presets.find((preset) => preset.pattern !== '' && fitPattern(preset.pattern, steps) === current)
}

/** A song's band with empty parts dropped; undefined when nothing is left. */
export function cleanSongBand(band: SongBand | undefined | null): SongBand | undefined {
  if (!band) return undefined
  const next: SongBand = {}
  if (band.drums && DRUM_PARTS.some((part) => patternHasHits(band.drums![part]))) next.drums = cleanDrumPattern(band.drums)
  if (patternHasHits(band.bassRhythm)) next.bassRhythm = cleanPattern(band.bassRhythm)
  if (patternHasHits(band.chordRhythm)) next.chordRhythm = cleanPattern(band.chordRhythm)
  return Object.keys(next).length > 0 ? next : undefined
}
