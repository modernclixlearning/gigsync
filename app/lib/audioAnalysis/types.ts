/**
 * Shared types for the client-side audio analysis (gs#28).
 *
 * Kept free of any runtime dependency so the pure modules (tempo/chords) and
 * the UI can import them without pulling TensorFlow.js into the main chunk.
 */

/** A transcribed note, same shape as basic-pitch's `NoteEventTime`. */
export interface NoteEvent {
  startTimeSeconds: number
  durationSeconds: number
  /** MIDI pitch number (60 = middle C). */
  pitchMidi: number
  /** 0..1 */
  amplitude: number
}

/** A point onset with a relative weight (e.g. note amplitude). */
export interface OnsetEvent {
  time: number
  weight: number
}

export interface TempoEstimate {
  bpm: number
  /** 0..1, rough periodicity strength — informative only. */
  confidence: number
}

export type ChordQuality = 'maj' | 'min' | '7' | 'm7'

export interface ChordMatch {
  /** Pitch class of the root, 0 = C. */
  root: number
  quality: ChordQuality
  /** Display/ChordPro label, e.g. "Am", "G7", "Bb". */
  label: string
  /** Cosine similarity between chroma and template, 0..1. */
  score: number
}

/** One chord cell of the detected progression (a full or half bar). */
export interface DetectedChordCell {
  /** Chord label, or null when the cell is (near) silent / unclear. */
  chord: string | null
  /** Beats this cell spans (== beatsPerBar for a full bar). */
  beats: number
  startTime: number
  endTime: number
  confidence: number
}

export interface DetectedBar {
  index: number
  startTime: number
  endTime: number
  cells: DetectedChordCell[]
}

export interface ChordProgression {
  bars: DetectedBar[]
  beatsPerBar: number
  /** Index of the beat (within the beat grid) chosen as the first downbeat. */
  downbeatOffset: number
}

export interface AudioAnalysisResult {
  bpm: number | null
  tempoConfidence: number
  beatsPerBar: number
  progression: ChordProgression
  noteCount: number
  durationSeconds: number
}
