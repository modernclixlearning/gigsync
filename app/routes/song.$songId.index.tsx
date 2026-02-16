import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef } from 'react'
import { ArrowLeft, Settings, Play, Pause, Music2, ScrollText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '~/lib/utils'
import { useSong, useSongPlayer } from '~/hooks/useSongs'
import { useSmartAutoScroll } from '~/hooks/useSmartAutoScroll'
import { useMetronomeSound } from '~/hooks/useMetronomeSound'
import { useAutoScroll } from '~/components/player/AutoScroll'
import { LyricsDisplay } from '~/components/player/LyricsDisplay'
import { ChordOverlay } from '~/components/player/ChordOverlay'
import { PlayerControls } from '~/components/player/PlayerControls'
import { VisualBeat } from '~/components/metronome/VisualBeat'
import { ROUTES, routeHelpers } from '~/lib/routes'
import { useSettings } from '~/hooks/useSettings'
import { BeatIndicator } from '~/components/player/BeatIndicator'

export const Route = createFileRoute('/song/$songId/')({
  component: SongPlayerPage
})

function SongPlayerPage() {
  const { songId } = Route.useParams()
  const navigate = useNavigate()
  const { song, isLoading, incrementPlayCount } = useSong(songId)
  const player = useSongPlayer()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { settings, updatePlayerSettings } = useSettings()

  const smartScrollContextWindowPercent =
    settings?.player.smartScrollContextWindow ?? 33
  const smartScrollSmoothness =
    settings?.player.smartScrollSmoothness ?? 70
  const showBeatIndicatorDebug =
    settings?.player.showBeatIndicatorDebug ?? false

  const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value))

  const handleContextWindowChange = useCallback(
    (value: number) => {
      void updatePlayerSettings({
        smartScrollContextWindow: clamp(value, 0, 100)
      })
    },
    [updatePlayerSettings]
  )

  const handleSmoothnessChange = useCallback(
    (value: number) => {
      void updatePlayerSettings({
        smartScrollSmoothness: clamp(value, 0, 100)
      })
    },
    [updatePlayerSettings]
  )

  const handleToggleBeatIndicator = useCallback(() => {
    const current = settings?.player.showBeatIndicatorDebug ?? false
    void updatePlayerSettings({
      showBeatIndicatorDebug: !current
    })
  }, [settings?.player.showBeatIndicatorDebug, updatePlayerSettings])

  const mapSmoothnessToDuration = (smoothness: number): number => {
    const normalized = clamp(smoothness, 0, 100) / 100
    const minDuration = 80 // ms
    const maxDuration = 600 // ms
    return Math.round(minDuration + (maxDuration - minDuration) * normalized)
  }

  // Smart BPM-synchronized autoscroll
  const autoScroll = useSmartAutoScroll({
    lyrics: song?.lyrics || '',
    bpm: song?.bpm || 120,
    timeSignature: song?.timeSignature || '4/4',
    isPlaying: player.state.isPlaying,
    isEnabled: player.state.isAutoScrollEnabled,
    containerRef: scrollContainerRef,
    contextWindowRatio: clamp(smartScrollContextWindowPercent, 0, 100) / 100,
    smoothScrollDuration: mapSmoothnessToDuration(smartScrollSmoothness),
    calculationOptions: {
      defaultBarsPerLine: 2,
      defaultBeatsPerChord: 4,
      intelligentEstimation: false
    }
  })

  // Fallback to simple autoscroll when Smart Autoscroll fails
  useAutoScroll({
    containerRef: scrollContainerRef,
    isEnabled: autoScroll.hasFallback && player.state.isAutoScrollEnabled,
    speed: player.state.autoScrollSpeed
  })

  // Metronome sound synchronized with autoscroll (only when Smart Autoscroll is active)
  const metronomeEnabled = player.state.metronomeSoundEnabled && player.state.isAutoScrollEnabled && !autoScroll.hasFallback
  const metronomeIsPlaying = player.state.isPlaying && player.state.isAutoScrollEnabled && !autoScroll.hasFallback
  
  useMetronomeSound({
    enabled: metronomeEnabled,
    bpm: song?.bpm || 120,
    timeSignature: song?.timeSignature || '4/4',
    currentBeatInBar: autoScroll.currentBeatInBar,
    currentBar: autoScroll.currentBar,
    isPlaying: metronomeIsPlaying,
    sound: 'classic',
    volume: 0.6,
    accentFirst: true,
  })

  // Parse time signature to get beats per bar
  const parseTimeSignature = (signature: string): number => {
    const [beats] = signature.split('/').map(Number)
    return beats || 4
  }
  const beatsPerBar = song ? parseTimeSignature(song.timeSignature) : 4

  // Increment play count when song starts playing
  useEffect(() => {
    if (player.state.isPlaying && song) {
      incrementPlayCount()
    }
  }, [player.state.isPlaying, song?.id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#101322] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    )
  }

  if (!song) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#101322] flex flex-col items-center justify-center">
        <Music2 className="w-12 h-12 text-slate-400 mb-4" />
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Song not found
        </h2>
        <Link
          to={ROUTES.HOME}
          className="text-indigo-500 hover:text-indigo-600"
        >
          Back to library
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#101322] flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-slate-50/80 dark:bg-[#101322]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => navigate({ to: ROUTES.HOME })}
            className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex-1 text-center px-4">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {song.title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {song.artist}
            </p>
          </div>

          {/* Visual Indicator */}
          <div className="flex items-center gap-3">
            {player.state.isPlaying && (
              <div className="flex items-center gap-1">
                <span className="w-1 h-4 bg-indigo-500 rounded-full animate-pulse" />
                <span className="w-1 h-6 bg-indigo-500 rounded-full animate-pulse delay-75" />
                <span className="w-1 h-3 bg-indigo-500 rounded-full animate-pulse delay-150" />
              </div>
            )}
            <Link
              {...routeHelpers.songEdit(song.id)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Song Info Bar */}
        <div className="flex items-center justify-center gap-4 px-4 pb-3 text-sm text-slate-500 dark:text-slate-400">
          <span>{song.key}{player.state.transpose !== 0 && ` (+${player.state.transpose})`}</span>
          <span>•</span>
          <span>{song.bpm} BPM</span>
          <span>•</span>
          <span>{song.timeSignature}</span>
          {player.state.isAutoScrollEnabled && player.state.isPlaying && !autoScroll.hasFallback && (
            <>
              <span>•</span>
              <div className="flex items-center gap-2">
                <VisualBeat
                  count={beatsPerBar}
                  activeIndex={autoScroll.currentBeatInBar + 1}
                  isPlaying={true}
                  variant="circles"
                  glow={true}
                  className="scale-90"
                />
              </div>
            </>
          )}
        </div>
      </header>

      {/* Fallback notification */}
      <AnimatePresence>
        {autoScroll.hasFallback && player.state.isAutoScrollEnabled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
          >
            <div className="flex items-start gap-3">
              <span className="text-amber-600 dark:text-amber-400 text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Autoscroll Simple Activado
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  No se pudo calcular el timeline musical. Usando autoscroll simple.
                </p>
              </div>
              <button
                onClick={autoScroll.retrySmartAutoscroll}
                className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 text-sm font-medium px-3 py-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                Reintentar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Beat/Bar indicator (debug) */}
      {showBeatIndicatorDebug &&
        player.state.isAutoScrollEnabled &&
        player.state.isPlaying &&
        !autoScroll.hasFallback && (
          <BeatIndicator
            beat={autoScroll.currentBeatInBar + 1}
            bar={autoScroll.currentBar}
          />
        )}

      {/* Current line highlight style - only show when Smart Autoscroll is active (no fallback) */}
      {autoScroll.currentElementId && player.state.isPlaying && player.state.isAutoScrollEnabled && !autoScroll.hasFallback && (
        <style>{`
          [data-element-id="${autoScroll.currentElementId}"] {
            background: rgba(79, 70, 229, 0.08);
            border-left: 3px solid rgb(99, 102, 241);
            padding-left: 0.75rem;
            border-radius: 0.25rem;
            transition: background 0.3s ease, border-left 0.3s ease;
          }
        `}</style>
      )}

      {/* Lyrics Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6"
        style={{ fontSize: `${player.state.fontSize}px` }}
      >
        {player.state.showChords ? (
          <ChordOverlay
            lyrics={song.lyrics}
            transpose={player.state.transpose}
          />
        ) : (
          <LyricsDisplay lyrics={song.lyrics} />
        )}
      </div>

      {/* Player Controls */}
      <PlayerControls
        isPlaying={player.state.isPlaying}
        onPlayPause={player.togglePlay}
        autoScrollEnabled={player.state.isAutoScrollEnabled}
        onToggleAutoScroll={player.toggleAutoScroll}
        autoScrollSpeed={player.state.autoScrollSpeed}
        onAutoScrollSpeedChange={player.setAutoScrollSpeed}
        showChords={player.state.showChords}
        onToggleChords={player.toggleChords}
        fontSize={player.state.fontSize}
        onFontSizeChange={player.setFontSize}
        transpose={player.state.transpose}
        onTranspose={player.transpose}
        onResetTranspose={player.resetTranspose}
        metronomeSoundEnabled={player.state.metronomeSoundEnabled}
        onToggleMetronomeSound={player.toggleMetronomeSound}
        smartScrollContextWindow={smartScrollContextWindowPercent}
        onSmartScrollContextWindowChange={handleContextWindowChange}
        smartScrollSmoothness={smartScrollSmoothness}
        onSmartScrollSmoothnessChange={handleSmoothnessChange}
        showBeatIndicatorDebug={showBeatIndicatorDebug}
        onToggleBeatIndicatorDebug={handleToggleBeatIndicator}
      />
    </div>
  )
}
