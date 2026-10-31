/**
 * From a recorded MIDI performance (played against GigSync's click) to the
 * chord progression — pure. The beat grid is the click itself, so the
 * downbeat is known instead of guessed as with a reference audio file.
 */

import { detectChordProgression, matchChord, PITCH_CLASS_NAMES } from '~/lib/audioAnalysis/chords'
import type { ChordProgression, NoteEvent } from '~/lib/audioAnalysis/types'

export interface RecordingGrid {
  bpm: number
  beatsPerBar: number
}

export function beatSeconds(bpm: number): number {
  return 60 / Math.max(1, bpm)
}

/** Bar and beat (both 1-based) at `time` seconds from the first downbeat. */
export function positionAt(time: number, { bpm, beatsPerBar }: RecordingGrid): { bar: number; beat: number } {
  const beatIndex = Math.max(0, Math.floor(time / beatSeconds(bpm) + 1e-6))
  const bpb = Math.max(1, Math.round(beatsPerBar))
  return { bar: Math.floor(beatIndex / bpb) + 1, beat: (beatIndex % bpb) + 1 }
}

/**
 * Chord progression of a performance that ended at `endTime`. The grid runs to
 * the end of the bar in progress, so stopping a little before the bar line
 * keeps that bar.
 */
export function recordingToProgression(
  notes: NoteEvent[],
  endTime: number,
  { bpm, beatsPerBar }: RecordingGrid,
): ChordProgression {
  const bpb = Math.max(1, Math.round(beatsPerBar))
  const beat = beatSeconds(bpm)
  const bars = Math.max(1, Math.ceil(endTime / beat / bpb - 1e-6))
  const beats = Array.from({ length: bars * bpb }, (_, i) => i * beat)
  return detectChordProgression(notes, beats, bpb, { downbeatOffset: 0, slashChords: true })
}

/**
 * What the keys being held spell: a chord label when there are three or more
 * pitch classes that fit one (an inversion is named after its bass: C/E),
 * otherwise the note names ("C", "C G").
 */
export function describeSounding(pitches: number[]): string | null {
  const classes = [...new Set(pitches.map((p) => ((p % 12) + 12) % 12))]
  if (classes.length === 0) return null
  if (classes.length >= 3) {
    const chroma = new Array<number>(12).fill(0)
    for (const pc of classes) chroma[pc] = 1
    // The lowest key is usually the root: weigh it a little more.
    const bass = ((Math.min(...pitches) % 12) + 12) % 12
    chroma[bass] += 0.5
    const match = matchChord(chroma, bass)
    if (match && match.score >= 0.8) return match.label
  }
  return [...pitches]
    .sort((a, b) => a - b)
    .map((p) => PITCH_CLASS_NAMES[((p % 12) + 12) % 12])
    .filter((name, i, all) => all.indexOf(name) === i)
    .join(' ')
}
