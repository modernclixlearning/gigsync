/**
 * Timeline Module
 * Exports for timeline calculation and utilities
 */

// Types
export type {
  TimelineElement,
  SongTimeline,
  TimelineCalculationOptions,
  TimelineMap,
  ParsedTimeSignature
} from '~/types/timeline'

// Utils
export {
  parseTimeSignature,
  beatsToSeconds,
  barsToBeats,
  secondsToBeats
} from './utils'

// Calculator
export {
  calculateElementDuration,
  createSongTimeline,
  applyCustomDurations
} from './calculator'
