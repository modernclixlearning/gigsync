/**
 * Chord detection from transcribed notes — pure functions.
 *
 * Notes (from basic-pitch) are folded into a 12-bin chroma per beat, beats are
 * grouped into bars, and each bar (or half bar, when the chord clearly changes
 * mid-bar) is labelled by cosine template matching against major, minor,
 * 7, m7, maj7, m7b5, dim and sus4 chords — optionally with the bass as a slash
 * chord (C/E). Labels are approximations meant for review, not ground truth.
 */

import type {
  ChordMatch,
  ChordProgression,
  ChordQuality,
  DetectedBar,
  DetectedChordCell,
  NoteEvent,
} from './types'

/** Musician-friendly spelling (sharps for C#/F#, flats for Eb/Ab/Bb). */
export const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

const QUALITY_INTERVALS: Record<ChordQuality, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  m7b5: [0, 3, 6, 10],
  dim: [0, 3, 6],
  sus4: [0, 5, 7],
}

const QUALITY_SUFFIX: Record<ChordQuality, string> = {
  maj: '',
  min: 'm',
  '7': '7',
  m7: 'm7',
  maj7: 'maj7',
  m7b5: 'm7b5',
  dim: 'dim',
  sus4: 'sus4',
}

/**
 * Four-note templates fit any triad-plus-extra chroma, so they get a small
 * handicap: a seventh is only reported when it's clearly present. Diminished
 * and suspended triads are rarer than major/minor, so they get it too.
 */
const QUALITY_PRIOR: Record<ChordQuality, number> = {
  maj: 1,
  min: 1,
  '7': 0.95,
  m7: 0.95,
  maj7: 0.95,
  m7b5: 0.95,
  dim: 0.95,
  sus4: 0.95,
}

export function chordLabel(root: number, quality: ChordQuality): string {
  return PITCH_CLASS_NAMES[((root % 12) + 12) % 12] + QUALITY_SUFFIX[quality]
}

/**
 * Chroma (energy per pitch class) of the notes sounding in [start, end).
 * Each note contributes amplitude × overlap duration. Very low notes get a
 * mild boost because the bass usually carries the chord root.
 */
export function chromaForWindow(notes: NoteEvent[], start: number, end: number): number[] {
  const chroma = new Array<number>(12).fill(0)
  if (!(end > start)) return chroma
  for (const note of notes) {
    const noteEnd = note.startTimeSeconds + note.durationSeconds
    const overlap = Math.min(end, noteEnd) - Math.max(start, note.startTimeSeconds)
    if (overlap <= 0) continue
    const bassBoost = note.pitchMidi < 52 ? 1.5 : 1
    chroma[((note.pitchMidi % 12) + 12) % 12] += note.amplitude * overlap * bassBoost
  }
  return chroma
}

export function addChroma(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + b[i])
}

function chromaEnergy(chroma: number[]): number {
  return chroma.reduce((s, v) => s + v, 0)
}

/**
 * Pitch class of the lowest sounding note for most of [start, end), or null
 * when no single bass note holds at least half of the time something sounds.
 */
export function bassForWindow(notes: NoteEvent[], start: number, end: number): number | null {
  if (!(end > start)) return null
  const SAMPLES = 24
  const counts = new Array<number>(12).fill(0)
  let sounding = 0
  for (let i = 0; i < SAMPLES; i++) {
    const t = start + ((i + 0.5) / SAMPLES) * (end - start)
    let lowest: number | null = null
    for (const note of notes) {
      if (note.startTimeSeconds <= t && t < note.startTimeSeconds + note.durationSeconds) {
        if (lowest === null || note.pitchMidi < lowest) lowest = note.pitchMidi
      }
    }
    if (lowest === null) continue
    sounding++
    counts[((lowest % 12) + 12) % 12]++
  }
  if (sounding === 0) return null
  const best = counts.indexOf(Math.max(...counts))
  return counts[best] * 2 >= sounding ? best : null
}

/**
 * Best matching chord for a chroma vector, or null if it's (near) empty.
 * The chroma is square-root compressed first so a loud bass root doesn't drown
 * the third/seventh in the cosine. With `bass` (a pitch class) that is a chord
 * tone other than the root, the label becomes a slash chord: C/E.
 */
export function matchChord(rawChroma: number[], bass: number | null = null): ChordMatch | null {
  const chroma = rawChroma.map(v => Math.sqrt(Math.max(0, v)))
  const norm = Math.sqrt(chroma.reduce((s, v) => s + v * v, 0))
  if (norm <= 1e-9) return null
  let best: ChordMatch | null = null
  for (const quality of Object.keys(QUALITY_INTERVALS) as ChordQuality[]) {
    const intervals = QUALITY_INTERVALS[quality]
    const templateNorm = Math.sqrt(intervals.length)
    for (let root = 0; root < 12; root++) {
      let dot = 0
      for (const iv of intervals) dot += chroma[(root + iv) % 12]
      const score = (dot / (norm * templateNorm)) * QUALITY_PRIOR[quality]
      if (!best || score > best.score + 1e-12) {
        best = { root, quality, label: chordLabel(root, quality), score }
      }
    }
  }
  if (best && bass !== null && bass !== best.root) {
    const bassInterval = (((bass - best.root) % 12) + 12) % 12
    if (QUALITY_INTERVALS[best.quality].includes(bassInterval)) {
      best = { ...best, bass, label: `${best.label}/${PITCH_CLASS_NAMES[bass]}` }
    }
  }
  return best
}

export interface ProgressionOptions {
  /**
   * Cells whose energy is below this fraction of the median bar energy are
   * reported as `chord: null` (silence / unclear).
   */
  silenceRatio?: number
  /** Minimum template score to accept a label at all. */
  minScore?: number
  /**
   * How much better (relative) two half-bar labels must fit than one whole-bar
   * label before a bar is split in two.
   */
  splitGain?: number
  /**
   * Beat index of the first downbeat when it's known (e.g. a recording made
   * against a click). Omitted → guessed from the harmony.
   */
  downbeatOffset?: number
  /**
   * Name inversions after their bass (C/E). Meant for played parts (a MIDI
   * keyboard), where the lowest note is the one the player chose; a band
   * recording's moving bass line would add slashes that aren't there.
   */
  slashChords?: boolean
}

const PROGRESSION_DEFAULTS: Required<Omit<ProgressionOptions, 'downbeatOffset'>> = {
  silenceRatio: 0.15,
  minScore: 0.5,
  splitGain: 0.08,
  slashChords: false,
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Sum of the per-beat chroma for beats [from, to). */
function sumBeats(beatChroma: number[][], from: number, to: number): number[] {
  let acc = new Array<number>(12).fill(0)
  for (let i = from; i < to; i++) acc = addChroma(acc, beatChroma[i])
  return acc
}

/**
 * Pick the downbeat: the bar alignment whose bars are most harmonically
 * "pure" (chords tend to change on the downbeat), energy-weighted.
 */
function chooseDownbeatOffset(beatChroma: number[][], beatsPerBar: number): number {
  let bestOffset = 0
  let bestScore = -Infinity
  for (let offset = 0; offset < beatsPerBar; offset++) {
    let score = 0
    for (let b = offset; b + beatsPerBar <= beatChroma.length; b += beatsPerBar) {
      const chroma = sumBeats(beatChroma, b, b + beatsPerBar)
      const match = matchChord(chroma)
      if (match) score += match.score * chromaEnergy(chroma)
    }
    if (score > bestScore + 1e-12) {
      bestScore = score
      bestOffset = offset
    }
  }
  return bestOffset
}

/**
 * Detect a bar-level chord progression.
 * @param notes   Transcribed notes.
 * @param beats   Beat times in seconds (ascending, roughly evenly spaced).
 * @param beatsPerBar Time-signature numerator.
 */
export function detectChordProgression(
  notes: NoteEvent[],
  beats: number[],
  beatsPerBar: number,
  options: ProgressionOptions = {},
): ChordProgression {
  const { silenceRatio, minScore, splitGain, slashChords } = { ...PROGRESSION_DEFAULTS, ...options }
  const bpb = Math.max(1, Math.round(beatsPerBar))
  if (beats.length < 2) return { bars: [], beatsPerBar: bpb, downbeatOffset: 0 }

  const beatPeriod = (beats[beats.length - 1] - beats[0]) / (beats.length - 1)
  const beatEnds = beats.map((t, i) => (i + 1 < beats.length ? beats[i + 1] : t + beatPeriod))
  const beatChroma = beats.map((t, i) => chromaForWindow(notes, t, beatEnds[i]))

  const downbeatOffset =
    options.downbeatOffset !== undefined
      ? Math.max(0, Math.round(options.downbeatOffset))
      : chooseDownbeatOffset(beatChroma, bpb)

  const barRanges: [number, number][] = []
  for (let b = downbeatOffset; b + bpb <= beats.length; b += bpb) barRanges.push([b, b + bpb])

  const barEnergies = barRanges.map(([a, b]) => chromaEnergy(sumBeats(beatChroma, a, b)))
  const silenceThreshold = median(barEnergies.filter(e => e > 0)) * silenceRatio

  const labelCell = (from: number, to: number, beatsInCell: number): DetectedChordCell => {
    const chroma = sumBeats(beatChroma, from, to)
    const energy = chromaEnergy(chroma)
    // Silence is judged per bar-equivalent so half bars aren't penalised.
    const scaledEnergy = (energy * bpb) / beatsInCell
    const bass = slashChords ? bassForWindow(notes, beats[from], beatEnds[to - 1]) : null
    const match = scaledEnergy >= silenceThreshold && energy > 0 ? matchChord(chroma, bass) : null
    const accepted = match && match.score >= minScore ? match : null
    return {
      chord: accepted ? accepted.label : null,
      beats: beatsInCell,
      startTime: beats[from],
      endTime: beatEnds[to - 1],
      confidence: accepted ? accepted.score : 0,
    }
  }

  const bars: DetectedBar[] = barRanges.map(([a, b], index) => {
    const whole = labelCell(a, b, bpb)
    let cells: DetectedChordCell[] = [whole]
    if (bpb % 2 === 0 && bpb >= 4) {
      const mid = a + bpb / 2
      const first = labelCell(a, mid, bpb / 2)
      const second = labelCell(mid, b, bpb / 2)
      if (
        first.chord &&
        second.chord &&
        first.chord !== second.chord &&
        (first.confidence + second.confidence) / 2 > whole.confidence * (1 + splitGain)
      ) {
        cells = [first, second]
      }
    }
    return { index, startTime: beats[a], endTime: beatEnds[b - 1], cells }
  })

  // Drop leading/trailing silent bars (count-in, fade-out).
  const isSilent = (bar: DetectedBar) => bar.cells.every(c => c.chord === null)
  let start = 0
  let end = bars.length
  while (start < end && isSilent(bars[start])) start++
  while (end > start && isSilent(bars[end - 1])) end--
  const trimmed = bars.slice(start, end).map((bar, i) => ({ ...bar, index: i }))

  return { bars: trimmed, beatsPerBar: bpb, downbeatOffset }
}
