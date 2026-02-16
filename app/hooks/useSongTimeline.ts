/**
 * useSongTimeline Hook
 * 
 * Manages song timeline calculation and element positioning for smart autoscroll.
 * Converts lyrics in ChordPro format into a musical timeline with beat-based timing.
 * 
 * The timeline is automatically recalculated when lyrics, BPM, or time signature change.
 * Element positions are measured from the DOM and stored for scroll calculations.
 * 
 * @example
 * ```tsx
 * const timeline = useSongTimeline({
 *   lyrics: '[Verse]\n[Am]Hello [G]world',
 *   bpm: 120,
 *   timeSignature: '4/4',
 *   calculationOptions: {
 *     defaultBarsPerLine: 2,
 *     intelligentEstimation: false
 *   }
 * })
 * 
 * // Get element at beat 4
 * const element = timeline.getElementAtBeat(4)
 * 
 * // Update DOM position after measurement
 * timeline.updateElementPosition('element-0', 100)
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { SongTimeline, TimelineElement, TimelineCalculationOptions } from '~/types/timeline'
import { createSongTimeline, applyCustomDurations } from '~/lib/timeline/calculator'

/**
 * Options for useSongTimeline hook
 */
export interface UseSongTimelineOptions {
  /** Lyrics in ChordPro format */
  lyrics: string
  /** Beats per minute (tempo) */
  bpm: number
  /** Time signature (e.g., "4/4", "3/4", "6/8") */
  timeSignature: string
  /** Optional calculation options to override defaults */
  calculationOptions?: Partial<TimelineCalculationOptions>
}

/**
 * Return value from useSongTimeline hook
 */
export interface UseSongTimelineReturn {
  /** Calculated timeline, or null if not ready or error occurred */
  timeline: SongTimeline | null
  /** True when timeline is calculated and ready to use */
  isReady: boolean
  
  /**
   * Get the timeline element at a specific beat position
   * @param beat - Beat number (0-based)
   * @returns Timeline element at that beat, or null if not found
   */
  getElementAtBeat: (beat: number) => TimelineElement | null
  
  /**
   * Get the scroll position (in pixels) for a specific beat
   * Requires element positions to be measured first via updateElementPosition
   * @param beat - Beat number (0-based)
   * @returns Scroll position in pixels, or 0 if element not found
   */
  getScrollPositionForBeat: (beat: number) => number
  
  /**
   * Update the DOM position of a timeline element
   * Call this after measuring element positions from the DOM
   * @param elementId - ID of the timeline element
   * @param position - Position in pixels from top of container
   */
  updateElementPosition: (elementId: string, position: number) => void
  
  /**
   * Set a custom duration (in beats) for a timeline element
   * Overrides the calculated duration and triggers timeline recalculation
   * @param elementId - ID of the timeline element
   * @param durationBeats - Custom duration in beats
   */
  setCustomDuration: (elementId: string, durationBeats: number) => void
  
  /** Error object if timeline calculation failed, null otherwise */
  error: Error | null
}

const DEFAULT_OPTIONS: TimelineCalculationOptions = {
  defaultBarsPerLine: 2,
  defaultBeatsPerChord: 4,
  intelligentEstimation: false // Start with simple for MVP
}

/**
 * Hook to calculate and manage song timeline from ChordPro lyrics
 * 
 * Automatically recalculates timeline when inputs change. Supports custom durations
 * for fine-tuning timing per element.
 * 
 * @param options - Configuration options for timeline calculation
 * @returns Timeline state and helper functions
 */
export function useSongTimeline({
  lyrics,
  bpm,
  timeSignature,
  calculationOptions
}: UseSongTimelineOptions): UseSongTimelineReturn {
  const [timeline, setTimeline] = useState<SongTimeline | null>(null)
  const elementPositionsRef = useRef<Map<string, number>>(new Map())
  const [customDurations, setCustomDurations] = useState<Map<string, number>>(new Map())
  const customDurationsRef = useRef(customDurations)
  const [error, setError] = useState<Error | null>(null)
  
  // Stabilize options by serializing - avoids infinite loop from inline objects
  const optionsKey = JSON.stringify(calculationOptions ?? {})
  
  // Keep customDurations ref in sync
  useEffect(() => {
    customDurationsRef.current = customDurations
  }, [customDurations])
  
  // Calculate timeline when inputs change
  useEffect(() => {
    try {
      const options = { ...DEFAULT_OPTIONS, ...JSON.parse(optionsKey) }
      let newTimeline = createSongTimeline(lyrics, bpm, timeSignature, options)
      
      // Apply custom durations if they exist
      const durations = customDurationsRef.current
      if (durations.size > 0) {
        newTimeline = {
          ...newTimeline,
          elements: applyCustomDurations(newTimeline.elements, durations)
        }
      }
      
      setTimeline(newTimeline)
      setError(null)
    } catch (err) {
      console.error('Failed to create timeline:', err)
      setError(err as Error)
      setTimeline(null)
    }
  }, [lyrics, bpm, timeSignature, optionsKey])
  
  // Find element at specific beat
  const getElementAtBeat = useCallback((beat: number): TimelineElement | null => {
    if (!timeline) return null
    
    return timeline.elements.find(
      el => beat >= el.startBeat && beat < el.endBeat
    ) ?? null
  }, [timeline])
  
  // Get scroll position for a beat
  const getScrollPositionForBeat = useCallback((beat: number): number => {
    const element = getElementAtBeat(beat)
    if (!element) return 0
    
    const position = elementPositionsRef.current.get(element.id)
    return position ?? 0
  }, [getElementAtBeat])
  
  // Update element position (called after DOM measurement)
  // Uses ref instead of state to avoid re-renders
  const updateElementPosition = useCallback((elementId: string, position: number) => {
    elementPositionsRef.current.set(elementId, position)
  }, [])
  
  // Set custom duration for an element
  const setCustomDuration = useCallback((elementId: string, durationBeats: number) => {
    setCustomDurations(prev => {
      const next = new Map(prev)
      next.set(elementId, durationBeats)
      return next
    })
  }, [])
  
  return {
    timeline,
    isReady: timeline !== null && error === null,
    getElementAtBeat,
    getScrollPositionForBeat,
    updateElementPosition,
    setCustomDuration,
    error
  }
}
