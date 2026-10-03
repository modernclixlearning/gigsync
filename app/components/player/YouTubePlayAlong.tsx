import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '~/lib/utils'
import { formatSeconds, normalizeStartSeconds } from '~/lib/youtube'
import {
  loadYouTubeIframeApi,
  YT_NOCOOKIE_HOST,
  YT_PLAYER_STATE,
  type YTPlayer,
} from '~/lib/youtubeIframeApi'

export interface YouTubePlayAlongProps {
  videoId: string
  /** Where play-along starts in the video (seconds). */
  startSeconds: number
  /** GigSync's single play state — the video follows it. */
  isPlaying: boolean
  /** Bump to send the video back to `startSeconds` (e.g. DAW Start from the top). */
  restartKey?: number
  /** Persist a new start offset (adjusted from the player). */
  onStartSecondsChange: (seconds: number) => void
  /** The user paused from the video's own controls → pause GigSync too. */
  onVideoPausedByUser?: () => void
}

type Status =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'unavailable'; message: string }

const FALLBACK_SUFFIX = 'El player sigue funcionando sin video.'

export function errorMessageForCode(code: number): string {
  switch (code) {
    case 100:
      return 'El video no existe, es privado o fue eliminado.'
    // YouTube also answers 150 for removed/private videos, so don't blame the owner.
    case 101:
    case 150:
      return 'Este video no se puede reproducir embebido (inserción deshabilitada, eliminado o privado).'
    case 2:
      return 'El link del video no es válido.'
    default:
      return 'YouTube no pudo reproducir el video.'
  }
}

/**
 * Hideable mini-player for play-along (issue #38). It has no play state of
 * its own: it mirrors `isPlaying` (which GigSync's Play/Pause, the keyboard
 * and the MIDI Clock transport all drive), so the video and the autoscroll
 * always start/stop together. If YouTube can't play (offline, removed, not
 * embeddable) it shows a notice and gets out of the way.
 */
export function YouTubePlayAlong({
  videoId,
  startSeconds,
  isPlaying,
  restartKey = 0,
  onStartSecondsChange,
  onVideoPausedByUser,
}: YouTubePlayAlongProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const [status, setStatus] = useState<Status>({ kind: 'loading' })
  const [isHidden, setIsHidden] = useState(false)
  const [noticeDismissed, setNoticeDismissed] = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  // Read from YouTube callbacks, which fire outside React's render cycle.
  const isPlayingRef = useRef(isPlaying)
  isPlayingRef.current = isPlaying
  const startRef = useRef(normalizeStartSeconds(startSeconds))
  startRef.current = normalizeStartSeconds(startSeconds)
  const onPausedByUserRef = useRef(onVideoPausedByUser)
  onPausedByUserRef.current = onVideoPausedByUser
  // True until the video is (re)positioned at the start offset on next play.
  const needsSeekRef = useRef(true)
  // Whether the video actually reached PLAYING since our last play command —
  // a blocked autoplay never does, so it can't be mistaken for a user pause.
  const videoWasPlayingRef = useRef(false)

  const syncToPlayState = useCallback(() => {
    const yt = playerRef.current
    if (!yt) return
    try {
      if (isPlayingRef.current) {
        if (needsSeekRef.current) {
          yt.seekTo(startRef.current, true)
          needsSeekRef.current = false
        }
        yt.playVideo()
      } else {
        videoWasPlayingRef.current = false
        const state = yt.getPlayerState()
        if (state === YT_PLAYER_STATE.PLAYING || state === YT_PLAYER_STATE.BUFFERING) {
          yt.pauseVideo()
        }
      }
    } catch {
      // A half-destroyed player must never break the lyrics player.
    }
  }, [])

  // Create / tear down the YouTube player for this video.
  useEffect(() => {
    let cancelled = false
    needsSeekRef.current = true
    videoWasPlayingRef.current = false
    setNoticeDismissed(false)

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStatus({ kind: 'unavailable', message: `Sin conexión: no se puede cargar el video. ${FALLBACK_SUFFIX}` })
      return
    }
    setStatus({ kind: 'loading' })

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !mountRef.current) return
        // YT replaces the element it is given; hand it a fresh child.
        const target = document.createElement('div')
        mountRef.current.replaceChildren(target)
        playerRef.current = new YT.Player(target, {
          host: YT_NOCOOKIE_HOST,
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            start: startRef.current,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (cancelled) return
              setStatus({ kind: 'ready' })
              syncToPlayState()
            },
            onStateChange: (event) => {
              if (event.data === YT_PLAYER_STATE.PLAYING) {
                videoWasPlayingRef.current = true
                return
              }
              // Pauses we issue only happen while GigSync is already paused,
              // so PLAYING → PAUSED while GigSync plays came from the video's
              // own controls: keep one play state and pause GigSync too.
              if (
                event.data === YT_PLAYER_STATE.PAUSED &&
                isPlayingRef.current &&
                videoWasPlayingRef.current
              ) {
                videoWasPlayingRef.current = false
                onPausedByUserRef.current?.()
              }
            },
            onError: (event) => {
              if (cancelled) return
              setStatus({
                kind: 'unavailable',
                message: `${errorMessageForCode(event.data)} ${FALLBACK_SUFFIX}`,
              })
              try {
                playerRef.current?.destroy()
              } catch {
                /* ignore */
              }
              playerRef.current = null
            },
          },
        })
      })
      .catch(() => {
        if (cancelled) return
        setStatus({
          kind: 'unavailable',
          message: `No se pudo cargar YouTube (¿sin conexión?). ${FALLBACK_SUFFIX}`,
        })
      })

    return () => {
      cancelled = true
      try {
        playerRef.current?.destroy()
      } catch {
        /* ignore */
      }
      playerRef.current = null
    }
  }, [videoId, retryToken, syncToPlayState])

  // Back online after failing → try again.
  useEffect(() => {
    if (status.kind !== 'unavailable') return
    const handleOnline = () => setRetryToken((n) => n + 1)
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [status.kind])

  // Follow GigSync's play state.
  useEffect(() => {
    if (status.kind === 'ready') syncToPlayState()
  }, [isPlaying, status.kind, syncToPlayState])

  // Restart from the top (DAW Start): back to the offset.
  const lastRestartKeyRef = useRef(restartKey)
  useEffect(() => {
    if (lastRestartKeyRef.current === restartKey) return
    lastRestartKeyRef.current = restartKey
    needsSeekRef.current = true
    if (status.kind === 'ready' && isPlayingRef.current) syncToPlayState()
  }, [restartKey, status.kind, syncToPlayState])

  const changeOffset = (seconds: number) => {
    const next = normalizeStartSeconds(seconds)
    // While paused, the next Play previews from the new offset.
    if (!isPlayingRef.current) needsSeekRef.current = true
    onStartSecondsChange(next)
  }

  const handleUseCurrentPosition = () => {
    const yt = playerRef.current
    if (!yt) return
    try {
      changeOffset(yt.getCurrentTime())
    } catch {
      /* ignore */
    }
  }

  const offset = normalizeStartSeconds(startSeconds)

  const isUnavailable = status.kind === 'unavailable'

  // The mini-player markup stays mounted in every state (just display:none
  // when unavailable) so the YouTube mount node is stable for a retry.
  return (
    <>
      {isUnavailable && !noticeDismissed && (
        <div
          role="status"
          className="mx-4 mt-3 px-3 py-2 rounded-lg text-xs flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
        >
          <span className="flex-1">📺 {status.message}</span>
          <button
            type="button"
            onClick={() => setNoticeDismissed(true)}
            className="font-medium hover:underline"
            aria-label="Cerrar aviso del video"
          >
            Cerrar
          </button>
        </div>
      )}
      {/* Collapsed: a pill to bring the video back. The iframe stays mounted
          (moved off-screen) so the audio keeps following Play/Pause. */}
      {isHidden && !isUnavailable && (
        <button
          type="button"
          onClick={() => setIsHidden(false)}
          className="fixed right-4 bottom-36 z-30 inline-flex items-center gap-1 px-3 py-2 rounded-full shadow-lg text-xs font-medium bg-white dark:bg-[#1a1f36] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
          aria-label="Mostrar video"
        >
          <span className="material-symbols-outlined text-base leading-none">smart_display</span>
          Video
        </button>
      )}
      <section
        aria-label="Video de YouTube"
        aria-hidden={isHidden || isUnavailable}
        className={cn(
          isUnavailable && 'hidden',
          'fixed z-30 w-64 sm:w-72 rounded-xl overflow-hidden shadow-xl',
          'bg-white dark:bg-[#1a1f36] border border-slate-200 dark:border-slate-700',
          isHidden ? '-left-[10000px] top-0' : 'right-4 bottom-36'
        )}
      >
        <div className="relative w-full aspect-video bg-black">
          <div ref={mountRef} className="absolute inset-0 [&>iframe]:w-full [&>iframe]:h-full" />
          {status.kind === 'loading' && (
            <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-300">
              Cargando video…
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 px-2 py-1.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="mr-1" title="Segundo del video donde arranca el play-along">
            Inicio {formatSeconds(offset)}
          </span>
          <button
            type="button"
            onClick={() => changeOffset(offset - 1)}
            disabled={offset === 0}
            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
            aria-label="Inicio un segundo antes"
          >
            −1s
          </button>
          <button
            type="button"
            onClick={() => changeOffset(offset + 1)}
            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800"
            aria-label="Inicio un segundo después"
          >
            +1s
          </button>
          <button
            type="button"
            onClick={handleUseCurrentPosition}
            disabled={status.kind !== 'ready'}
            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
            title="Usar la posición actual del video como inicio"
          >
            Usar actual
          </button>
          <button
            type="button"
            onClick={() => setIsHidden(true)}
            className="ml-auto p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Ocultar video"
            title="Ocultar video (sigue sonando)"
          >
            <span className="material-symbols-outlined text-base leading-none">close_fullscreen</span>
          </button>
        </div>
      </section>
    </>
  )
}
