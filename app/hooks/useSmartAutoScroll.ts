/**
 * useSmartAutoScroll Hook
 * Intelligent autoscroll synchronized with BPM and song structure
 */

import { useRef, useEffect, useCallback } from 'react'
import { useSongTimeline, type UseSongTimelineOptions } from './useSongTimeline'
import { useBPMSync } from './useBPMSync'

export interface UseSmartAutoScrollOptions extends UseSongTimelineOptions {
  isPlaying: boolean
  isEnabled: boolean
  containerRef: React.RefObject<HTMLElement | null>
  contextWindowBars?: number // Number of bars to show before/after current
  smoothScrollDuration?: number // ms for smooth scroll animation
}

export interface UseSmartAutoScrollReturn {
  currentBeat: number
  currentBar: number
  currentElementId: string | null
  isReady: boolean
  play: () => Promise<void>
  pause: () => void
  reset: () => void
  seekToBeat: (beat: number) => void
}

const DEFAULT_SMOOTH_SCROLL_DURATION = 100 // ms

export function useSmartAutoScroll({
  lyrics,
  bpm,
  timeSignature,
  calculationOptions,
  isPlaying,
  isEnabled,
  containerRef,
  smoothScrollDuration = DEFAULT_SMOOTH_SCROLL_DURATION
}: UseSmartAutoScrollOptions): UseSmartAutoScrollReturn {
  const currentElementIdRef = useRef<string | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const smoothScrollDurationRef = useRef(smoothScrollDuration)
  smoothScrollDurationRef.current = smoothScrollDuration
  
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
    if (!tl.timeline || !containerRefStable.current) return
    
    const element = tl.getElementAtBeat(beat)
    if (!element) return
    
    // Track current element
    currentElementIdRef.current = element.id
    
    // Get scroll position for this beat
    const targetPosition = tl.getScrollPositionForBeat(beat)
    
    if (targetPosition > 0) {
      smoothScrollTo(targetPosition)
    }
  }, [containerRefStable, smoothScrollTo])
  
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
  
  // Reset when disabled
  useEffect(() => {
    if (!isEnabled) {
      bpmSync.reset()
      currentElementIdRef.current = null
    }
  }, [isEnabled])
  
  return {
    currentBeat: bpmSync.currentBeat,
    currentBar: bpmSync.currentBar,
    currentElementId: currentElementIdRef.current,
    isReady: timeline.isReady,
    play: bpmSync.play,
    pause: bpmSync.pause,
    reset: bpmSync.reset,
    seekToBeat: bpmSync.seekToBeat
  }
}
