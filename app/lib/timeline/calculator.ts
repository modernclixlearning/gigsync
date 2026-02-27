/**
 * Timeline Calculator
 * 
 * Calculate durations and create song timelines from ChordPro lyrics.
 * Handles different element types (instrumental, chords-only, lyrics) with
 * appropriate duration estimation strategies.
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
 * Calculate the duration of a single timeline element in beats
 * 
 * Duration calculation priority:
 * 1. Instrumental sections: Use explicit bar count (e.g., [Intro | 4 bars])
 * 2. Chords-only lines: One bar per chord bar separator
 * 3. Lyric lines: Use estimation mode (simple or intelligent)
 * 4. Section headers and empty lines: 0 beats (visual markers only)
 * 
 * @param element - Parsed line element from ChordPro
 * @param options - Calculation options (estimation mode, defaults)
 * @param timeSignature - Time signature string (e.g., "4/4")
 * @returns Duration in beats
 * 
 * @example
 * ```ts
 * // Instrumental section
 * const instrumental = { type: 'instrumental', section: { bars: 4 } }
 * calculateElementDuration(instrumental, options, '4/4') // Returns 16 beats
 * 
 * // Lyric line
 * const lyric = { type: 'lyric', chords: [], text: 'Hello world' }
 * calculateElementDuration(lyric, { defaultBarsPerLine: 2 }, '4/4') // Returns 8 beats
 * ```
 */
export function calculateElementDuration(
  element: AnyParsedLine,
  options: TimelineCalculationOptions,
  timeSignature: string
): number {
  const { beats: beatsPerBar } = parseTimeSignature(timeSignature)
  
  switch (element.type) {
    case 'instrumental': {
      // Sum actual beats per bar — supports partial bars (anacrusis) via bar.beats
      const { chordBars, bars } = (element as InstrumentalLine).section
      if (chordBars.length > 0) {
        return chordBars.reduce((sum, bar) => sum + (bar.beats ?? beatsPerBar), 0)
      }
      return bars * beatsPerBar
    }

    case 'chords-only':
      // Sum actual beats per bar — supports partial bars (anacrusis) via bar.beats
      return (element as ChordsOnlyLine).chordBars.reduce(
        (sum, bar) => sum + (bar.beats ?? beatsPerBar), 0
      )
      
    case 'lyric': {
      const lyricLine = element as LyricParsedLine
      // When the line carries chord annotations, use defaultBarsPerLine so that
      // lines with more chords than bars (e.g. 4 chords in 2 bars at 2 beats each)
      // are timed correctly. The beat-per-chord value is durationBeats / chords.length.
      if (lyricLine.chords.length > 0) {
        return options.defaultBarsPerLine * beatsPerBar
      }
      // No chords: fall back to the configured estimation strategy
      if (options.intelligentEstimation) {
        return estimateLineDurationIntelligent(lyricLine, beatsPerBar)
      }
      return estimateLineDurationSimple(lyricLine, beatsPerBar, options)
    }
      
    case 'section':
    case 'empty':
      // No duration - just visual markers
      return 0
      
    default:
      return 0
  }
}

/**
 * Simple duration estimation for lyric lines
 * 
 * Uses a fixed number of bars per line regardless of content.
 * This is the default mode for MVP (predictable but less accurate).
 * 
 * @param line - Parsed lyric line
 * @param beatsPerBar - Beats per bar from time signature
 * @param options - Calculation options containing defaultBarsPerLine
 * @returns Duration in beats
 * 
 * @example
 * ```ts
 * // Default 2 bars per line in 4/4 time
 * estimateLineDurationSimple(line, 4, { defaultBarsPerLine: 2 }) // Returns 8 beats
 * ```
 */
function estimateLineDurationSimple(
  line: LyricParsedLine,
  beatsPerBar: number,
  options: TimelineCalculationOptions
): number {
  return options.defaultBarsPerLine * beatsPerBar
}

/**
 * Intelligent duration estimation for lyric lines
 * 
 * Analyzes chord density and text length to estimate duration:
 * - No chords: 2 bars (default)
 * - Many chords (4+): ~1.5 chords per bar
 * - Long text with few chords: minimum 2 bars
 * - Otherwise: 1 bar per chord, minimum 2 bars
 * 
 * More accurate than simple mode but requires more analysis.
 * 
 * @param line - Parsed lyric line with chords and text
 * @param beatsPerBar - Beats per bar from time signature
 * @returns Duration in beats
 * 
 * @example
 * ```ts
 * // Line with 4 chords
 * const line = { chords: [{chord: 'Am'}, {chord: 'G'}, {chord: 'C'}, {chord: 'F'}], text: '...' }
 * estimateLineDurationIntelligent(line, 4) // Returns ~11 beats (ceil(4/1.5) * 4)
 * ```
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
 * Create a complete song timeline from ChordPro lyrics
 * 
 * Parses lyrics, calculates duration for each element, and builds a timeline
 * with cumulative beat positions. Skips directive lines (they don't appear in timeline).
 * 
 * @param lyrics - ChordPro formatted lyrics string
 * @param bpm - Beats per minute (tempo)
 * @param timeSignature - Time signature string (e.g., "4/4", "3/4")
 * @param options - Calculation options for duration estimation
 * @returns Complete song timeline with elements and timing information
 * 
 * @example
 * ```ts
 * const timeline = createSongTimeline(
 *   '[Verse]\n[Am]Hello [G]world',
 *   120,
 *   '4/4',
 *   { defaultBarsPerLine: 2, intelligentEstimation: false }
 * )
 * 
 * // timeline.elements contains timeline elements with startBeat, endBeat, etc.
 * // timeline.totalBeats = total duration in beats
 * // timeline.totalDurationSeconds = total duration in seconds
 * ```
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

  let i = 0
  while (i < parsed.lines.length) {
    const line = parsed.lines[i]

    // Skip directive lines (they don't appear in timeline)
    if (line.type === 'directive') { i++; continue }

    let duration = calculateElementDuration(line, options, timeSignature)

    // Merge chords-only + lyric pairs into a single timeline element.
    // When a chord-row (chords-only) is immediately followed by a lyric line,
    // they belong together musically — the chords annotate that lyric.
    // Use the longer of the two durations so timing stays accurate.
    let skipNext = false
    if (line.type === 'chords-only' && i + 1 < parsed.lines.length && parsed.lines[i + 1].type === 'lyric') {
      const lyricDuration = calculateElementDuration(parsed.lines[i + 1], options, timeSignature)
      duration = Math.max(duration, lyricDuration)
      skipNext = true
    }

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
    i++
    if (skipNext) i++ // skip the paired lyric line — it's rendered inside the chords-only block
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
 * 
 * Overrides calculated durations with user-specified values and recalculates
 * all startBeat and endBeat positions to maintain continuity.
 * 
 * Elements without custom durations keep their original calculated duration.
 * 
 * @param elements - Array of timeline elements
 * @param customDurations - Map of element ID to custom duration in beats
 * @returns New array of elements with updated durations and timestamps
 * 
 * @example
 * ```ts
 * const customDurations = new Map([
 *   ['element-0', 16], // Override to 16 beats
 *   ['element-1', 12]  // Override to 12 beats
 * ])
 * 
 * const updated = applyCustomDurations(elements, customDurations)
 * // Updated elements have new durations and recalculated startBeat/endBeat
 * ```
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
