/**
 * Timeline Calculator
 * Calculate durations and create song timelines
 */

import { parseChordPro } from '~/lib/chordpro'
import type { 
  AnyParsedLine, 
  LyricParsedLine,
  InstrumentalLine,
  ChordsOnlyLine
} from '~/lib/chordpro'
import type { 
  TimelineElement, 
  SongTimeline, 
  TimelineCalculationOptions 
} from '~/types/timeline'
import { parseTimeSignature, barsToBeats, beatsToSeconds } from './utils'

/**
 * Calculate the duration of a single element in beats
 */
export function calculateElementDuration(
  element: AnyParsedLine,
  options: TimelineCalculationOptions,
  timeSignature: string
): number {
  const { beats: beatsPerBar } = parseTimeSignature(timeSignature)
  
  switch (element.type) {
    case 'instrumental':
      // Explicit duration from section (e.g., [Intro | 4 bars])
      return (element as InstrumentalLine).section.bars * beatsPerBar
      
    case 'chords-only':
      // Each chord bar is one measure
      return (element as ChordsOnlyLine).chordBars.length * beatsPerBar
      
    case 'lyric':
      // Estimate based on mode
      if (options.intelligentEstimation) {
        return estimateLineDurationIntelligent(element as LyricParsedLine, beatsPerBar)
      }
      return estimateLineDurationSimple(element as LyricParsedLine, beatsPerBar, options)
      
    case 'section':
    case 'empty':
      // No duration - just visual markers
      return 0
      
    default:
      return 0
  }
}

/**
 * Simple estimation: Use default bars per line
 */
function estimateLineDurationSimple(
  line: LyricParsedLine,
  beatsPerBar: number,
  options: TimelineCalculationOptions
): number {
  return options.defaultBarsPerLine * beatsPerBar
}

/**
 * Intelligent estimation: Analyze chord density and text length
 */
function estimateLineDurationIntelligent(
  line: LyricParsedLine,
  beatsPerBar: number
): number {
  const chordCount = line.chords.length
  const textLength = line.text.length
  
  // No chords: default 2 bars
  if (chordCount === 0) {
    return 2 * beatsPerBar
  }
  
  // Many chords (4+): Assume ~1.5 chords per bar
  if (chordCount >= 4) {
    return Math.ceil(chordCount / 1.5) * beatsPerBar
  }
  
  // Long text with few chords: minimum 2 bars
  if (chordCount <= 2 && textLength > 40) {
    return 2 * beatsPerBar
  }
  
  // Default: 1 bar per chord, minimum 2 bars
  return Math.max(chordCount, 2) * beatsPerBar
}

/**
 * Create a complete song timeline from lyrics
 */
export function createSongTimeline(
  lyrics: string,
  bpm: number,
  timeSignature: string,
  options: TimelineCalculationOptions
): SongTimeline {
  const parsed = parseChordPro(lyrics)
  const elements: TimelineElement[] = []
  
  let currentBeat = 0
  const { beats: beatsPerBar } = parseTimeSignature(timeSignature)
  
  for (let i = 0; i < parsed.lines.length; i++) {
    const line = parsed.lines[i]
    
    // Skip directive lines (they don't appear in timeline)
    if (line.type === 'directive') continue
    
    const duration = calculateElementDuration(line, options, timeSignature)
    
    elements.push({
      id: `element-${i}`,
      type: line.type,
      startBeat: currentBeat,
      endBeat: currentBeat + duration,
      durationBeats: duration,
      bars: duration / beatsPerBar,
      content: line
    })
    
    currentBeat += duration
  }
  
  const totalDurationSeconds = beatsToSeconds(currentBeat, bpm)
  
  return {
    elements,
    totalBeats: currentBeat,
    totalBars: currentBeat / beatsPerBar,
    totalDurationSeconds,
    beatsPerBar,
    bpm
  }
}

/**
 * Apply custom durations to timeline elements and recalculate timestamps
 */
export function applyCustomDurations(
  elements: TimelineElement[],
  customDurations: Map<string, number>
): TimelineElement[] {
  let currentBeat = 0
  
  return elements.map(element => {
    const customDuration = customDurations.get(element.id)
    const duration = customDuration ?? element.durationBeats
    
    const updated = {
      ...element,
      startBeat: currentBeat,
      endBeat: currentBeat + duration,
      durationBeats: duration
    }
    
    currentBeat += duration
    
    return updated
  })
}
