/**
 * useSmartAutoScroll Hook
 * 
 * Intelligent autoscroll synchronized with BPM and song structure.
 * Automatically scrolls lyrics container to follow the current beat position,
 * maintaining a context window for better readability.
 * 
 * Features:
 * - BPM-synchronized scrolling (follows musical timing, not arbitrary speed)
 * - Context window positioning (current line at configurable ratio from top, default 33%)
 * - Smooth scroll animation with ease-out cubic easing
 * - Automatic DOM position measurement
 * - Current element tracking for highlighting
 * 
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null)
 * 
 * const autoscroll = useSmartAutoScroll({
 *   lyrics: song.lyrics,
 *   bpm: 120,
 *   timeSignature: '4/4',
 *   isPlaying: true,
 *   isEnabled: true,
 *   containerRef,
 *   smoothScrollDuration: 100
 * })
 * 
 * // Use currentElementId for highlighting
 * <div data-element-id={autoscroll.currentElementId}>
 *   Current line
 * </div>
 * ```
 * 
 * @remarks
 * - Requires container elements to have `data-element-id` attributes matching timeline element IDs
 * - Automatically measures element positions from DOM when timeline is ready
 * - Scrolls only when both `isPlaying` and `isEnabled` are true
 * - Context window positions current line at a configurable percentage of viewport height (like reading a book)
 */

import { useRef, useEffect, useCallback, useState } from 'react'
import { useSongTimeline, type UseSongTimelineOptions } from './useSongTimeline'
import { useBPMSync } from './useBPMSync'
import type { TimelineElement } from '~/types/timeline'

/** Returns the number of chord cells in a timeline element (lyric, chords-only, or instrumental). */
function getChordCount(element: TimelineElement): number {
  const content = element.content
  if (!content || !('type' in content)) return 0
  if (content.type === 'lyric') return (content as { chords: unknown[] }).chords?.length ?? 0
  if (content.type === 'chords-only') return (content as { chordBars: unknown[] }).chordBars?.length ?? 0
  if (content.type === 'instrumental') return (content as { section: { chordBars: unknown[] } }).section?.chordBars?.length ?? 0
  return 0
}

/**
 * Options for useSmartAutoScroll hook
 * Extends UseSongTimelineOptions with playback and scroll configuration
 */
export interface UseSmartAutoScrollOptions extends UseSongTimelineOptions {
  /** Whether playback is active */
  isPlaying: boolean
  /** Whether autoscroll is enabled (both must be true for scrolling) */
  isEnabled: boolean
  /** Ref to the scrollable container element */
  containerRef: React.RefObject<HTMLElement | null>
  /** Number of bars to show before/after current (currently unused, context window uses a ratio of viewport height) */
  contextWindowBars?: number
  /**
   * Vertical position of the current line within the viewport, as a ratio of container height.
   * 0 = top, 1 = bottom. Default is 0.33 (one third from the top).
   */
  contextWindowRatio?: number
  /** Duration of smooth scroll animation in milliseconds (default: 100ms) */
  smoothScrollDuration?: number
}

/**
 * Return value from useSmartAutoScroll hook
 */
export interface UseSmartAutoScrollReturn {
  /** Current absolute beat number from BPM sync */
  currentBeat: number
  /** Current bar number from BPM sync */
  currentBar: number
  /** Current beat within current bar (0-based) */
  currentBeatInBar: number
  /** ID of the currently active timeline element (for highlighting) */
  currentElementId: string | null
  /** Start beat of the currently active timeline element */
  currentElementStartBeat: number | null
  /**
   * Beats per chord cell for the currently active element.
   * Use this to compute which chord cell is active: Math.floor(elapsed / currentBeatsPerChord).
   */
  currentBeatsPerChord: number
  /** True when timeline is calculated and ready */
  isReady: boolean
  /** True when fallback to simple autoscroll is active */
  hasFallback: boolean
  /** Function to retry smart autoscroll after fallback */
  retrySmartAutoscroll: () => void
  /**
   * Start playback (proxies to BPM sync)
   * @returns Promise that resolves when AudioContext is ready
   */
  play: () => Promise<void>
  /** Pause playback (proxies to BPM sync) */
  pause: () => void
  /** Reset to beginning (proxies to BPM sync) */
  reset: () => void
  /**
   * Seek to specific beat (proxies to BPM sync)
   * @param beat - Target beat number (0-based)
   */
  seekToBeat: (beat: number) => void
  /**
   * Seek to a timeline element by ID and optional chord index.
   * Encapsulates the formula: targetBeat = element.startBeat + chordIndex * beatsPerBar.
   * No-op when timeline is not ready or fallback is active.
   * @param elementId - The timeline element ID (e.g. "element-3")
   * @param chordIndex - 0-based chord/bar cell index within the element (omit to seek to element start)
   */
  seekToElement: (elementId: string, chordIndex?: number) => void
}

/** Default duration for smooth scroll animation in milliseconds */
const DEFAULT_SMOOTH_SCROLL_DURATION = 100 // ms

/**
 * Hook for intelligent BPM-synchronized autoscroll
 * 
 * Combines timeline calculation and BPM synchronization to provide
 * musical scroll that follows the song structure beat-by-beat.
 * 
 * @param options - Configuration for smart autoscroll
 * @returns Current playback state, element tracking, and control functions
 */
export function useSmartAutoScroll({
  lyrics,
  bpm,
  timeSignature,
  calculationOptions,
  isPlaying,
  isEnabled,
  containerRef,
  contextWindowRatio = 0.33,
  smoothScrollDuration = DEFAULT_SMOOTH_SCROLL_DURATION
}: UseSmartAutoScrollOptions): UseSmartAutoScrollReturn {
  const currentElementIdRef = useRef<string | null>(null)
  const currentElementStartBeatRef = useRef<number | null>(null)
  const currentBeatsPerChordRef = useRef<number>(4)
  const animationFrameRef = useRef<number | null>(null)
  const smoothScrollDurationRef = useRef(smoothScrollDuration)
  smoothScrollDurationRef.current = smoothScrollDuration
  
  // Fallback state: true when timeline fails and we need to use simple autoscroll
  const [hasFallback, setHasFallback] = useState(false)
  const fallbackRetryKeyRef = useRef(0)
  
  // Timeline calculation
  const timeline = useSongTimeline({
    lyrics,
    bpm,
    timeSignature,
    calculationOptions
  })
  
  // Keep refs for stable callback access
  const timelineRef = useRef(timeline)
  timelineRef.current = timeline
  const containerRefStable = containerRef
  const isEnabledRef = useRef(isEnabled)
  isEnabledRef.current = isEnabled
  
  // Smooth scroll animation
  const smoothScrollTo = useCallback((targetPosition: number) => {
    const container = containerRefStable.current
    if (!container) return
    
    const startPosition = container.scrollTop
    const distance = targetPosition - startPosition
    
    // Skip tiny scrolls
    if (Math.abs(distance) < 1) return
    
    const startTime = performance.now()
    const duration = smoothScrollDurationRef.current
    
    function animate(currentTime: number) {
      if (!container) return
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Ease-out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      
      container.scrollTop = startPosition + (distance * easeProgress)
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }
    
    // Cancel previous animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    animationFrameRef.current = requestAnimationFrame(animate)
  }, [containerRefStable])
  
  // Stable beat change handler via ref pattern
  const handleBeatChange = useCallback((beat: number) => {
    if (!isEnabledRef.current) return
    
    const tl = timelineRef.current
    const container = containerRefStable.current
    if (!tl.timeline || !container) return
    
    const element = tl.getElementAtBeat(beat)
    if (!element) return
    
    // Track current element
    currentElementIdRef.current = element.id
    currentElementStartBeatRef.current = element.startBeat
    const chordCount = getChordCount(element)
    const elDuration = element.durationBeats ?? (tl.timeline?.beatsPerBar ?? 4)
    currentBeatsPerChordRef.current = chordCount > 0
      ? elDuration / chordCount
      : (tl.timeline?.beatsPerBar ?? 4)
    
    // Get raw scroll position for this beat
    const rawPosition = tl.getScrollPositionForBeat(beat)
    
    if (rawPosition >= 0) {
      // Context window: position current line at configurable ratio of viewport height
      // so musician can see more "ahead" (like reading a book)
      const containerHeight = container.clientHeight
      const contextOffset = containerHeight * contextWindowRatio
      const targetPosition = Math.max(0, rawPosition - contextOffset)
      
      smoothScrollTo(targetPosition)
    }
  }, [containerRefStable, smoothScrollTo, contextWindowRatio])
  
  // BPM synchronization
  const bpmSync = useBPMSync({
    bpm,
    timeSignature,
    isPlaying: isPlaying && isEnabled,
    onBeatChange: handleBeatChange
  })
  
  // Measure element positions when timeline is ready (only once per timeline change)
  const timelineElementsCount = timeline.timeline?.elements.length ?? 0
  const timelineTotalBeats = timeline.timeline?.totalBeats ?? 0
  
  useEffect(() => {
    if (!timeline.timeline || !containerRef.current) return
    
    const container = containerRef.current
    const elements = timeline.timeline.elements
    
    // Wait for next frame to ensure DOM is ready
    const frameId = requestAnimationFrame(() => {
      elements.forEach(element => {
        const domElement = container.querySelector(`[data-element-id="${element.id}"]`)
        if (domElement) {
          const position = (domElement as HTMLElement).offsetTop
          timeline.updateElementPosition(element.id, position)
        }
      })
    })
    
    return () => cancelAnimationFrame(frameId)
  }, [timelineElementsCount, timelineTotalBeats])
  
  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])
  
  // Detect timeline failures and activate fallback
  useEffect(() => {
    // Only check for fallback when autoscroll is enabled
    if (!isEnabled) {
      // Reset fallback when disabled
      setHasFallback(false)
      return
    }
    
    // Check if timeline has failed
    const timelineFailed = timeline.error !== null || (timeline.timeline === null && timeline.isReady)
    
    if (timelineFailed && !hasFallback) {
      // Activate fallback when timeline fails
      setHasFallback(true)
    } else if (!timelineFailed && hasFallback && timeline.timeline !== null) {
      // Automatically recover when timeline is restored
      setHasFallback(false)
      fallbackRetryKeyRef.current += 1
    }
  }, [isEnabled, timeline.error, timeline.timeline, timeline.isReady, hasFallback])
  
  // Reset when disabled
  useEffect(() => {
    if (!isEnabled) {
      bpmSync.reset()
      currentElementIdRef.current = null
      currentElementStartBeatRef.current = null
    }
  }, [isEnabled])
  
  // Seek to a timeline element by ID and optional chord index
  const seekToElement = useCallback((elementId: string, chordIndex?: number) => {
    if (!timeline.isReady || hasFallback) return
    const elements = timeline.timeline?.elements
    if (!elements) return
    const element = elements.find(e => e.id === elementId)
    if (!element) return

    if (chordIndex === undefined) {
      bpmSync.seekToBeat(element.startBeat)
      return
    }

    const beatsPerBar = timeline.timeline?.beatsPerBar ?? 4
    const content = element.content

    // For bar-based elements (instrumental, chords-only), sum beats up to chordIndex
    // so that partial bars (anacrusis) are seeked correctly.
    let barBeats: number[] | null = null
    if (content && 'type' in content) {
      if (content.type === 'instrumental') {
        barBeats = (content as { section: { chordBars: { beats?: number }[] } })
          .section.chordBars.map(b => b.beats ?? beatsPerBar)
      } else if (content.type === 'chords-only') {
        barBeats = (content as { chordBars: { beats?: number }[] })
          .chordBars.map(b => b.beats ?? beatsPerBar)
      }
    }

    const targetBeat = barBeats
      ? element.startBeat + barBeats.slice(0, chordIndex).reduce((s, b) => s + b, 0)
      : element.startBeat + chordIndex * (element.durationBeats / getChordCount(element))

    bpmSync.seekToBeat(targetBeat)
  }, [timeline.isReady, timeline.timeline, hasFallback, bpmSync.seekToBeat])

  // Retry function: resets fallback state to force re-evaluation
  const retrySmartAutoscroll = useCallback(() => {
    setHasFallback(false)
    fallbackRetryKeyRef.current += 1
    // Force timeline recalculation by updating key
    // The timeline hook will recalculate automatically
  }, [])
  
  return {
    currentBeat: bpmSync.currentBeat,
    currentBar: bpmSync.currentBar,
    currentBeatInBar: bpmSync.currentBeatInBar,
    currentElementId: currentElementIdRef.current,
    currentElementStartBeat: currentElementStartBeatRef.current,
    currentBeatsPerChord: currentBeatsPerChordRef.current,
    isReady: timeline.isReady,
    hasFallback,
    retrySmartAutoscroll,
    play: bpmSync.play,
    pause: bpmSync.pause,
    reset: bpmSync.reset,
    seekToBeat: bpmSync.seekToBeat,
    seekToElement
  }
}
