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

import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { useSongTimeline, type UseSongTimelineOptions } from './useSongTimeline'
import { useBPMSync } from './useBPMSync'
import type { SongTimeline, TimelineElement } from '~/types/timeline'
import { chordCellBeats } from '~/lib/timeline/chordEvents'

export { chordCellBeats }

/**
 * Chord cell playing `elapsed` beats into its element, by each chord's own
 * length — so a chord of 2.5 hands over to the next one at the "and" of 3.
 * Past the end it stays on the last cell; null when there are no chords.
 */
export function chordIndexAt(cellBeats: number[], elapsed: number): number | null {
  if (cellBeats.length === 0) return null
  let end = 0
  for (let i = 0; i < cellBeats.length; i++) {
    end += cellBeats[i]
    if (elapsed < end) return i
  }
  return cellBeats.length - 1
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
  /**
   * Tempo for the Tone.Transport only (e.g. the BPM followed from a DAW's MIDI
   * Clock). The timeline is laid out in beats, so it keeps using `bpm` and is
   * not recalculated on every tempo nudge. Defaults to `bpm`. When set, the
   * Transport tempo is owned by whoever follows the clock and is not written here.
   */
  transportBpm?: number | null
}

/**
 * Return value from useSmartAutoScroll hook
 */
/**
 * Scroll offset that places the active line inside the visible area:
 * ratio 0 puts its top at the top, 0.5 centers it, 1 puts its bottom at the
 * bottom. A line taller than the viewport is aligned to the top, so its start
 * is always readable.
 */
export function scrollTargetForLine(
  lineTop: number,
  lineHeight: number,
  containerHeight: number,
  ratio: number
): number {
  const r = Math.min(1, Math.max(0, ratio))
  const freeSpace = Math.max(0, containerHeight - lineHeight)
  return Math.max(0, lineTop - freeSpace * r)
}

/**
 * The line whose levare covers `beat`: its `pickupBeats` end exactly where
 * its first chord starts.
 */
export function findPickupElement(elements: TimelineElement[], beat: number): string | null {
  for (const el of elements) {
    const pickupBeats = el.content.type === 'lyric' ? el.content.pickupBeats : undefined
    if (pickupBeats && beat >= el.startBeat - pickupBeats && beat < el.startBeat) return el.id
  }
  return null
}

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
   * Chord cell of the active element playing right now (its `data-chord-index`),
   * timed by each chord's own length and the 16th-note beat. null = none.
   */
  currentChordIndex: number | null
  /** True when timeline is calculated and ready */
  isReady: boolean
  /** Length of the song's timeline in beats (0 until it's computed) */
  totalBeats: number
  /** Current beat including its 16th-note subdivision */
  preciseBeat: number
  /**
   * Line whose levare (words before its first chord, `[^N]`) is being sung
   * right now, over the end of the previous line. Null otherwise.
   */
  pickupElementId: string | null
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
  /**
   * Maps each parsed line index to its timeline element ID.
   * Pass to ChordOverlay so it can assign data-element-id without duplicating merge logic.
   * Null when timeline is not yet ready.
   */
  lineIndexToElementId: Map<number, string> | null
  /** The song's timeline (null until computed). */
  timeline: SongTimeline | null
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
  contextWindowRatio = 0.5,
  smoothScrollDuration = DEFAULT_SMOOTH_SCROLL_DURATION,
  transportBpm
}: UseSmartAutoScrollOptions): UseSmartAutoScrollReturn {
  const currentElementIdRef = useRef<string | null>(null)
  const currentElementStartBeatRef = useRef<number | null>(null)
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
    
    // Measure the active line now, in the container's own scroll coordinates:
    // positions measured once at load go stale when the font size, the
    // lines-per-block grouping or the side panel change the layout.
    const lineEl = container.querySelector<HTMLElement>(`[data-element-id="${element.id}"]`)
    if (lineEl) {
      const lineTop =
        lineEl.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
      smoothScrollTo(
        scrollTargetForLine(lineTop, lineEl.offsetHeight, container.clientHeight, contextWindowRatio)
      )
    } else {
      const rawPosition = tl.getScrollPositionForBeat(beat)
      if (rawPosition >= 0) {
        smoothScrollTo(scrollTargetForLine(rawPosition, 0, container.clientHeight, contextWindowRatio))
      }
    }
  }, [containerRefStable, smoothScrollTo, contextWindowRatio])
  
  // BPM synchronization
  const bpmSync = useBPMSync({
    bpm: transportBpm ?? bpm,
    timeSignature,
    isPlaying: isPlaying && isEnabled,
    onBeatChange: handleBeatChange,
    // A DAW's clock is driving the Transport tempo (useMIDITransportSync).
    externalTempo: transportBpm != null
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

    // Sum each chord's own beats up to chordIndex, so partial bars (anacrusis),
    // syncopated chords and an instrumental's repeats are seeked correctly.
    const cellBeats = chordCellBeats(element, timeline.timeline?.beatsPerBar ?? 4)
    const targetBeat = element.startBeat + cellBeats.slice(0, chordIndex).reduce((s, b) => s + b, 0)

    bpmSync.seekToBeat(targetBeat)
  }, [timeline.isReady, timeline.timeline, hasFallback, bpmSync.seekToBeat])

  // Retry function: resets fallback state to force re-evaluation
  const retrySmartAutoscroll = useCallback(() => {
    setHasFallback(false)
    fallbackRetryKeyRef.current += 1
    // Force timeline recalculation by updating key
    // The timeline hook will recalculate automatically
  }, [])
  
  const timelineElements = timeline.timeline?.elements
  const pickupElementId = useMemo(
    () => (isEnabled && timelineElements ? findPickupElement(timelineElements, bpmSync.preciseBeat) : null),
    [isEnabled, timelineElements, bpmSync.preciseBeat]
  )

  // Timed on the 16th-note beat, so a chord that starts on an "and" lights up there.
  const activeElement = currentElementIdRef.current
    ? timelineElements?.find((e) => e.id === currentElementIdRef.current)
    : undefined
  const currentChordIndex = activeElement
    ? chordIndexAt(
        chordCellBeats(activeElement, timeline.timeline?.beatsPerBar ?? 4),
        bpmSync.preciseBeat - activeElement.startBeat
      )
    : null

  return {
    currentBeat: bpmSync.currentBeat,
    preciseBeat: bpmSync.preciseBeat,
    pickupElementId,
    currentBar: bpmSync.currentBar,
    currentBeatInBar: bpmSync.currentBeatInBar,
    currentElementId: currentElementIdRef.current,
    currentElementStartBeat: currentElementStartBeatRef.current,
    currentChordIndex,
    isReady: timeline.isReady,
    /** Length of the song's timeline in beats (0 until it's computed). */
    totalBeats: timelineTotalBeats,
    hasFallback,
    retrySmartAutoscroll,
    play: bpmSync.play,
    pause: bpmSync.pause,
    reset: bpmSync.reset,
    seekToBeat: bpmSync.seekToBeat,
    seekToElement,
    lineIndexToElementId: timeline.timeline?.lineIndexToElementId ?? null,
    timeline: timeline.timeline
  }
}
