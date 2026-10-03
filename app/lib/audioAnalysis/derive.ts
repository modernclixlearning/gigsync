/**
 * Notes (+ optional raw audio) → BPM + chord progression. Pure; runs inside
 * the analysis worker right after basic-pitch, and in unit tests.
 */

import { detectChordProgression } from './chords'
import {
  ENVELOPE_FPS,
  estimateBeatGrid,
  estimateTempo,
  mixEnvelopes,
  noteOnsets,
  onsetEnvelopeFromEvents,
  onsetEnvelopeFromSamples,
} from './tempo'
import type { AudioAnalysisResult, NoteEvent } from './types'

export interface DeriveInput {
  notes: NoteEvent[]
  durationSeconds: number
  beatsPerBar: number
  /** Mono PCM of the same audio, used for a percussive onset envelope. */
  samples?: Float32Array
  sampleRate?: number
}

export function deriveBpmAndChords(input: DeriveInput): AudioAnalysisResult {
  const { notes, durationSeconds, beatsPerBar, samples, sampleRate } = input
  const envelopes = [onsetEnvelopeFromEvents(noteOnsets(notes), durationSeconds, ENVELOPE_FPS)]
  if (samples && sampleRate) {
    envelopes.push(onsetEnvelopeFromSamples(samples, sampleRate, ENVELOPE_FPS))
  }
  const envelope = envelopes.length > 1 ? mixEnvelopes(...envelopes) : envelopes[0]

  const tempo = estimateTempo(envelope, ENVELOPE_FPS)
  const beats = tempo ? estimateBeatGrid(envelope, tempo.bpm, ENVELOPE_FPS) : []
  const progression = detectChordProgression(notes, beats, beatsPerBar)

  return {
    bpm: tempo ? tempo.bpm : null,
    tempoConfidence: tempo ? tempo.confidence : 0,
    beatsPerBar: progression.beatsPerBar,
    progression,
    noteCount: notes.length,
    durationSeconds,
  }
}
