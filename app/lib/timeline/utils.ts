/**
 * Timeline Utilities
 * Helper functions for time signature parsing and conversions
 */

import type { ParsedTimeSignature } from '~/types/timeline'

/**
 * Parse a time signature string into beats and note value
 * @example parseTimeSignature('4/4') // { beats: 4, noteValue: 4 }
 * @example parseTimeSignature('3/4') // { beats: 3, noteValue: 4 }
 */
export function parseTimeSignature(signature: string): ParsedTimeSignature {
  const [beats, noteValue] = signature.split('/').map(Number)
  
  return {
    beats: beats || 4,
    noteValue: noteValue || 4
  }
}

/**
 * Convert beats to seconds based on BPM
 * @param beats Number of beats
 * @param bpm Beats per minute
 * @returns Duration in seconds
 */
export function beatsToSeconds(beats: number, bpm: number): number {
  return (beats / bpm) * 60
}

/**
 * Convert bars (measures) to beats
 * @param bars Number of bars/measures
 * @param beatsPerBar Beats per bar (from time signature)
 * @returns Total beats
 */
export function barsToBeats(bars: number, beatsPerBar: number): number {
  return bars * beatsPerBar
}

/**
 * Convert seconds to beats based on BPM
 * @param seconds Duration in seconds
 * @param bpm Beats per minute
 * @returns Number of beats
 */
export function secondsToBeats(seconds: number, bpm: number): number {
  return (seconds * bpm) / 60
}
