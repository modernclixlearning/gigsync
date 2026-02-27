import { useCallback, useEffect, useRef } from 'react'
import { ArrowLeft, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { cn } from '~/lib/utils'
import { useSong, useSongPlayer } from '~/hooks/useSongs'
import { useSmartAutoScroll } from '~/hooks/useSmartAutoScroll'
import { useMetronomeSound } from '~/hooks/useMetronomeSound'
import { useAutoScroll } from '~/components/player/AutoScroll'
import { LyricsDisplay } from '~/components/player/LyricsDisplay'
import { ChordOverlay } from '~/components/player/ChordOverlay'
import { PlayerControls } from '~/components/player/PlayerControls'
import { VisualBeat } from '~/components/metronome/VisualBeat'
import { routeHelpers } from '~/lib/routes'
import { useSettings } from '~/hooks/useSettings'
import { BeatIndicator } from '~/components/player/BeatIndicator'
import type { Song } from '~/types'

export interface SetlistContext {
  setlistId: string
  setlistName?: string
  currentIndex: number
  totalSongs: number
  nextSong?: Song
  onPrevious: () => void
  onNext: () => void
  onExit: () => void
}

export interface SongPlayerContentProps {
  song: Song
  onBack?: () => void
  setlistContext?: SetlistContext
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

export function SongPlayerContent({
  song,
  onBack,
  setlistContext
}: SongPlayerContentProps) {
  const player = useSongPlayer()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { incrementPlayCount } = useSong(song.id)
  const { settings, updatePlayerSettings } = useSettings()

  const smartScrollContextWindowPercent =
    settings?.player.smartScrollContextWindow ?? 33
  const smartScrollSmoothness =
    settings?.player.smartScrollSmoothness ?? 70
  const showBeatIndicatorDebug =
    settings?.player.showBeatIndicatorDebug ?? false

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
    const minDuration = 80
    const maxDuration = 600
    return Math.round(minDuration + (maxDuration - minDuration) * normalized)
  }

  const autoScroll = useSmartAutoScroll({
    lyrics: song.lyrics || '',
    bpm: song.bpm || 120,
    timeSignature: song.timeSignature || '4/4',
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

  useAutoScroll({
    containerRef: scrollContainerRef,
    isEnabled: autoScroll.hasFallback && player.state.isAutoScrollEnabled,
    speed: player.state.autoScrollSpeed
  })

  const metronomeEnabled =
    player.state.metronomeSoundEnabled &&
    player.state.isAutoScrollEnabled &&
    !autoScroll.hasFallback
  const metronomeIsPlaying =
    player.state.isPlaying &&
    player.state.isAutoScrollEnabled &&
    !autoScroll.hasFallback

  useMetronomeSound({
    enabled: metronomeEnabled,
    bpm: song.bpm || 120,
    timeSignature: song.timeSignature || '4/4',
    currentBeatInBar: autoScroll.currentBeatInBar,
    currentBar: autoScroll.currentBar,
    isPlaying: metronomeIsPlaying,
    sound: 'classic',
    volume: 0.6,
    accentFirst: true
  })

  const parseTimeSignature = (signature: string): number => {
    const [beats] = signature.split('/').map(Number)
    return beats || 4
  }
  const beatsPerBar = parseTimeSignature(song.timeSignature)

  // Seek-to-Section: true when chord-cell clicks should trigger seek
  const isSeekEnabled =
    autoScroll.isReady &&
    !autoScroll.hasFallback &&
    player.state.isAutoScrollEnabled

  const handleChordClick = useCallback(
    (elementId: string, chordIndex: number | null) => {
      if (!autoScroll.isReady || autoScroll.hasFallback) return
      autoScroll.seekToElement(elementId, chordIndex ?? undefined)
    },
    [autoScroll]
  )

  useEffect(() => {
    if (player.state.isPlaying && song) {
      incrementPlayCount()
    }
  }, [player.state.isPlaying, song?.id, incrementPlayCount])

  // Keyboard navigation in setlist mode (pause + reset before changing song)
  useEffect(() => {
    if (!setlistContext) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        if (setlistContext.currentIndex < setlistContext.totalSongs - 1) {
          player.pause()
          autoScroll.reset()
          setlistContext.onNext()
        }
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (setlistContext.currentIndex > 0) {
          player.pause()
          autoScroll.reset()
          setlistContext.onPrevious()
        }
      }
      if (e.key === 'Escape') {
        setlistContext.onExit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setlistContext, player, autoScroll])

  const isSetlistMode = !!setlistContext

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col',
        isSetlistMode ? 'dark bg-[#05060b]' : 'bg-slate-50 dark:bg-[#101322]'
      )}
    >
      {/* Setlist progress bar */}
      {isSetlistMode && setlistContext && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-white/10 z-30">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: `${((setlistContext.currentIndex + 1) / setlistContext.totalSongs) * 100}%`
            }}
          />
        </div>
      )}

      {/* Top Bar */}
      <header
        className={cn(
          'sticky top-0 z-20 backdrop-blur-md border-b border-slate-200 dark:border-slate-800',
          isSetlistMode ? 'bg-[#05060b]/80 pt-2' : 'bg-slate-50/80 dark:bg-[#101322]/80'
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          {isSetlistMode && setlistContext ? (
            <div className="flex items-center gap-2">
              <button
                onClick={setlistContext.onExit}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                aria-label="Exit setlist"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    player.pause()
                    autoScroll.reset()
                    setlistContext.onPrevious()
                  }}
                  disabled={setlistContext.currentIndex === 0}
                  className={cn(
                    'p-2 rounded-full transition-colors',
                    setlistContext.currentIndex === 0
                      ? 'bg-white/5 text-white/30 cursor-not-allowed'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  )}
                  aria-label="Previous song"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button
                  onClick={() => {
                    player.pause()
                    autoScroll.reset()
                    setlistContext.onNext()
                  }}
                  disabled={
                    setlistContext.currentIndex === setlistContext.totalSongs - 1
                  }
                  className={cn(
                    'p-2 rounded-full transition-colors',
                    setlistContext.currentIndex === setlistContext.totalSongs - 1
                      ? 'bg-white/5 text-white/30 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary/80 text-white'
                  )}
                  aria-label="Next song"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex-1 text-center px-4">
            <h1
              className={cn(
                'text-lg font-bold truncate',
                isSetlistMode ? 'text-white' : 'text-slate-900 dark:text-white'
              )}
            >
              {song.title}
            </h1>
            <p
              className={cn(
                'text-sm truncate',
                isSetlistMode ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'
              )}
            >
              {song.artist}
            </p>
            {isSetlistMode && setlistContext && (
              <p className="text-xs text-slate-500 mt-0.5">
                {setlistContext.currentIndex + 1} / {setlistContext.totalSongs}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {player.state.isPlaying && (
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    'w-1 h-4 rounded-full animate-pulse',
                    isSetlistMode ? 'bg-primary' : 'bg-indigo-500'
                  )}
                />
                <span
                  className={cn(
                    'w-1 h-6 rounded-full animate-pulse delay-75',
                    isSetlistMode ? 'bg-primary' : 'bg-indigo-500'
                  )}
                />
                <span
                  className={cn(
                    'w-1 h-3 rounded-full animate-pulse delay-150',
                    isSetlistMode ? 'bg-primary' : 'bg-indigo-500'
                  )}
                />
              </div>
            )}
            {!isSetlistMode && (
              <Link
                {...routeHelpers.songEdit(song.id)}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <Settings className="w-5 h-5" />
              </Link>
            )}
          </div>
        </div>

        {/* Song Info Bar */}
        <div
          className={cn(
            'flex items-center justify-center gap-4 px-4 pb-3 text-sm',
            isSetlistMode ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'
          )}
        >
          <span>
            {song.key}
            {player.state.transpose !== 0 && ` (+${player.state.transpose})`}
          </span>
          <span>•</span>
          <span>{song.bpm} BPM</span>
          <span>•</span>
          <span>{song.timeSignature}</span>
          {player.state.isAutoScrollEnabled &&
            player.state.isPlaying &&
            !autoScroll.hasFallback && (
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

      {/* Current line + per-bar highlight style */}
      {autoScroll.currentElementId &&
        player.state.isPlaying &&
        player.state.isAutoScrollEnabled &&
        !autoScroll.hasFallback && (() => {
          const eid = autoScroll.currentElementId
          // Which bar (chord cell) is the playhead on right now?
          // Use currentBeatsPerChord (= elementDuration / chordCount) so lines with
          // more chords than bars (e.g. 4 chords in 2 bars) highlight at the correct rate.
          const chordIdx =
            autoScroll.currentElementStartBeat !== null
              ? Math.floor(
                  (autoScroll.currentBeat - autoScroll.currentElementStartBeat) / autoScroll.currentBeatsPerChord
                )
              : null
          return (
            <style>{`
              /* General line highlight */
              [data-element-id="${eid}"] {
                background: rgba(79, 70, 229, 0.08);
                border-left: 3px solid rgb(99, 102, 241);
                padding-left: 0.75rem;
                border-radius: 0.25rem;
                transition: background 0.3s ease;
              }
              /* Grid elements (bar grids + instrumental): remove the left-border
                 decoration — the active cell highlight is enough */
              [data-element-id="${eid}"][data-bar-element] {
                border-left: none;
                padding-left: 0;
                background: rgba(79, 70, 229, 0.04);
              }
              ${chordIdx !== null ? `
              /* Active bar cell highlight */
              [data-element-id="${eid}"] [data-chord-index="${chordIdx}"] {
                background: rgba(99, 102, 241, 0.18) !important;
                border-color: rgb(99, 102, 241) !important;
              }
              [data-element-id="${eid}"] [data-chord-index="${chordIdx}"] > span:first-child {
                color: rgb(79, 70, 229);
              }
              ` : ''}
            `}</style>
          )
        })()}

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
            columns={player.state.fontSize > 18 ? 2 : 4}
            onChordClick={handleChordClick}
            isSeekEnabled={isSeekEnabled}
          />
        ) : (
          <LyricsDisplay lyrics={song.lyrics} />
        )}
      </div>

      {/* Next song preview (setlist mode) */}
      {isSetlistMode && setlistContext?.nextSong && (
        <div className="px-4 pb-2 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Siguiente: <span className="text-slate-600 dark:text-slate-300">{setlistContext.nextSong.title}</span>
          </p>
        </div>
      )}

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
