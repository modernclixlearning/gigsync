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

const DEFAULT_CONTEXT_WINDOW_BARS = 2
const DEFAULT_SMOOTH_SCROLL_DURATION = 100 // ms

export function useSmartAutoScroll({
  lyrics,
  bpm,
  timeSignature,
  calculationOptions,
  isPlaying,
  isEnabled,
  containerRef,
  contextWindowBars = DEFAULT_CONTEXT_WINDOW_BARS,
  smoothScrollDuration = DEFAULT_SMOOTH_SCROLL_DURATION
}: UseSmartAutoScrollOptions): UseSmartAutoScrollReturn {
  const currentElementIdRef = useRef<string | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  
  // Timeline calculation
  const timeline = useSongTimeline({
    lyrics,
    bpm,
    timeSignature,
    calculationOptions
  })
  
  // BPM synchronization
  const bpmSync = useBPMSync({
    bpm,
    timeSignature,
    isPlaying: isPlaying && isEnabled,
    onBeatChange: handleBeatChange
  })
  
  // Handle beat changes - update scroll position
  function handleBeatChange(beat: number) {
    if (!isEnabled || !timeline.timeline || !containerRef.current) return
    
    const element = timeline.getElementAtBeat(beat)
    if (!element) return
    
    // Track current element
    currentElementIdRef.current = element.id
    
    // Get scroll position for this beat
    const targetPosition = timeline.getScrollPositionForBeat(beat)
    
    if (targetPosition > 0) {
      smoothScrollTo(targetPosition)
    }
  }
  
  // Smooth scroll animation
  function smoothScrollTo(targetPosition: number) {
    if (!containerRef.current) return
    
    const container = containerRef.current
    const startPosition = container.scrollTop
    const distance = targetPosition - startPosition
    const startTime = performance.now()
    
    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / smoothScrollDuration, 1)
      
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
  }
  
  // Measure element positions when timeline is ready
  useEffect(() => {
    if (!timeline.timeline || !containerRef.current) return
    
    const container = containerRef.current
    const elements = timeline.timeline.elements
    
    // Wait for next frame to ensure DOM is ready
    requestAnimationFrame(() => {
      elements.forEach(element => {
        const domElement = container.querySelector(`[data-element-id="${element.id}"]`)
        if (domElement) {
          const position = (domElement as HTMLElement).offsetTop
          timeline.updateElementPosition(element.id, position)
        }
      })
    })
  }, [timeline.timeline, containerRef])
  
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
