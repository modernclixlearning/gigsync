/**
 * useSongTimeline Hook
 * Manages song timeline calculation and element positioning
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { SongTimeline, TimelineElement, TimelineCalculationOptions } from '~/types/timeline'
import { createSongTimeline, applyCustomDurations } from '~/lib/timeline/calculator'

export interface UseSongTimelineOptions {
  lyrics: string
  bpm: number
  timeSignature: string
  calculationOptions?: Partial<TimelineCalculationOptions>
}

export interface UseSongTimelineReturn {
  timeline: SongTimeline | null
  isReady: boolean
  
  // Navigation
  getElementAtBeat: (beat: number) => TimelineElement | null
  getScrollPositionForBeat: (beat: number) => number
  updateElementPosition: (elementId: string, position: number) => void
  
  // Override manual
  setCustomDuration: (elementId: string, durationBeats: number) => void
  
  // Estado
  error: Error | null
}

const DEFAULT_OPTIONS: TimelineCalculationOptions = {
  defaultBarsPerLine: 2,
  defaultBeatsPerChord: 4,
  intelligentEstimation: false // Start with simple for MVP
}

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
