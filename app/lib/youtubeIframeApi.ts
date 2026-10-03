// Minimal local typing + loader for the YouTube IFrame Player API
// (https://developers.google.com/youtube/iframe_api_reference). Loaded on
// demand via a script tag — no npm dependency, no API key.

export const YT_PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const

export interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getPlayerState(): number
  destroy(): void
}

export interface YTPlayerEvent {
  target: YTPlayer
  data: number
}

export interface YTPlayerOptions {
  host?: string
  videoId: string
  width?: number | string
  height?: number | string
  playerVars?: Record<string, string | number>
  events?: {
    onReady?: (event: YTPlayerEvent) => void
    onStateChange?: (event: YTPlayerEvent) => void
    onError?: (event: YTPlayerEvent) => void
  }
}

export interface YTNamespace {
  Player: new (element: HTMLElement | string, options: YTPlayerOptions) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

export const YT_IFRAME_API_SRC = 'https://www.youtube.com/iframe_api'
/** Privacy-enhanced embed domain (AC-3). */
export const YT_NOCOOKIE_HOST = 'https://www.youtube-nocookie.com'

let pending: Promise<YTNamespace> | null = null

/**
 * Loads the IFrame API once. Rejects on network error or timeout (offline,
 * blocked); a later call retries from scratch.
 */
export function loadYouTubeIframeApi(timeoutMs = 15000): Promise<YTNamespace> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (pending) return pending

  pending = new Promise<YTNamespace>((resolve, reject) => {
    const script = document.createElement('script')
    let settled = false
    const fail = (reason: string) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      script.remove()
      pending = null
      reject(new Error(reason))
    }
    const timer = window.setTimeout(() => fail('YouTube IFrame API timed out'), timeoutMs)

    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.()
      if (settled) return
      if (!window.YT?.Player) return fail('YouTube IFrame API missing after ready')
      settled = true
      window.clearTimeout(timer)
      resolve(window.YT)
    }

    script.src = YT_IFRAME_API_SRC
    script.async = true
    script.onerror = () => fail('YouTube IFrame API failed to load')
    document.head.appendChild(script)
  })
  return pending
}

/** Test-only: forget the cached loader promise. */
export function __resetYouTubeIframeApiLoader(): void {
  pending = null
}
