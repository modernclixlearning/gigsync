/**
 * Timeline Types
 * Types for smart autoscroll timeline system
 */

import type { AnyParsedLine } from '~/lib/chordpro'
import type { RefObject } from 'react'

/**
 * A single element in the song timeline with timing information
 */
export interface TimelineElement {
  id: string
  type: 'section' | 'lyric' | 'instrumental' | 'chords-only' | 'empty'
  
  // Musical timing
  startBeat: number
  endBeat: number
  durationBeats: number
  bars: number
  
  // Visual position (calculated after DOM measurement)
  domRef?: RefObject<HTMLElement>
  scrollPosition?: number
  
  // Original content from parser
  content: AnyParsedLine
}

/**
 * Complete timeline for a song
 */
export interface SongTimeline {
  elements: TimelineElement[]
  totalBeats: number
  totalBars: number
  totalDurationSeconds: number
  beatsPerBar: number
  bpm: number
}

/**
 * Options for timeline calculation
 */
export interface TimelineCalculationOptions {
  /** Default number of bars per lyric line (if no chords or explicit duration) */
  defaultBarsPerLine: number
  
  /** Default beats per chord in chord-only lines */
  defaultBeatsPerChord: number
  
  /** Use intelligent estimation based on chord density and text length */
  intelligentEstimation: boolean
}

/**
 * Map of element positions for quick lookup
 */
export interface TimelineMap {
  [elementId: string]: {
    position: number
    duration: number
  }
}

/**
 * Parsed time signature
 */
export interface ParsedTimeSignature {
  beats: number
  noteValue: number
}
