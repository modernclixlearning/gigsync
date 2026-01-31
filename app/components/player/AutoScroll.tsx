import { useEffect, useRef, useCallback } from 'react'

interface UseAutoScrollOptions {
  containerRef: React.RefObject<HTMLElement>
  isEnabled: boolean
  speed: number // 0-100, where 50 is default speed
}

/**
 * useAutoScroll - Hook for automatic scrolling of lyrics/content
 * Speed is normalized: 0 = very slow, 50 = normal, 100 = fast
 */
export function useAutoScroll({
  containerRef,
  isEnabled,
  speed
}: UseAutoScrollOptions): void {
  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  // Convert speed (0-100) to pixels per second (0.5 - 5 pixels per frame at 60fps)
  const getPixelsPerFrame = useCallback(() => {
    // Map 0-100 to 0.1-3 pixels per frame
    const minSpeed = 0.1
    const maxSpeed = 3
    return minSpeed + (speed / 100) * (maxSpeed - minSpeed)
  }, [speed])

  useEffect(() => {
    if (!isEnabled || !containerRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      return
    }

    const container = containerRef.current
    const pixelsPerFrame = getPixelsPerFrame()

    const scroll = (currentTime: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = currentTime
      }

      const deltaTime = currentTime - lastTimeRef.current
      
      // Only scroll if enough time has passed (target ~60fps)
      if (deltaTime >= 16) {
        const scrollAmount = pixelsPerFrame * (deltaTime / 16)
        container.scrollTop += scrollAmount
        lastTimeRef.current = currentTime

        // Check if we've reached the bottom
        const isAtBottom =
          container.scrollHeight - container.scrollTop <= container.clientHeight + 1
        
        if (isAtBottom) {
          // Stop scrolling at bottom
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
            animationFrameRef.current = null
          }
          return
        }
      }

      animationFrameRef.current = requestAnimationFrame(scroll)
    }

    animationFrameRef.current = requestAnimationFrame(scroll)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      lastTimeRef.current = 0
    }
  }, [isEnabled, containerRef, getPixelsPerFrame])
}

// Export component wrapper for potential visual controls
interface AutoScrollProps {
  children: React.ReactNode
  isEnabled: boolean
  speed: number
  className?: string
}

export function AutoScrollContainer({
  children,
  isEnabled,
  speed,
  className
}: AutoScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useAutoScroll({
    containerRef,
    isEnabled,
    speed
  })

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}
