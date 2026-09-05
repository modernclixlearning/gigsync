import { useCallback, useEffect, useMemo, useRef } from 'react'
import { ArrowLeft, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { cn } from '~/lib/utils'
import { parseChordPro, groupLyricLineIndices } from '~/lib/chordpro'
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
import type { Song, PlayerOverrideKey } from '~/types'

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
  const { incrementPlayCount, updateSong } = useSong(song.id)
  const { settings, updatePlayerSettings } = useSettings()

  const smartScrollContextWindowPercent =
    settings?.player.smartScrollContextWindow ?? 33
  const smartScrollSmoothness =
    settings?.player.smartScrollSmoothness ?? 70
  const showBeatIndicatorDebug =
    settings?.player.showBeatIndicatorDebug ?? false

  // Apply this song's own control overrides (if any), else the global
  // defaults saved via "Usar como default", once per song load. Guarded by
  // ref so a later settings/song refetch (e.g. right after saving) doesn't
  // stomp on a value the user is actively adjusting live.
  const appliedOverridesForSongRef = useRef<string | null>(null)
  useEffect(() => {
    if (!settings) return
    if (appliedOverridesForSongRef.current === song.id) return
    appliedOverridesForSongRef.current = song.id

    const overrides = song.playerOverrides
    const resolve = (key: PlayerOverrideKey): number | undefined =>
      overrides?.[key] ?? settings.player[key]

    const autoScrollSpeed = resolve('autoScrollSpeed')
    if (autoScrollSpeed !== undefined) player.setAutoScrollSpeed(autoScrollSpeed)
    const fontSize = resolve('fontSize')
    if (fontSize !== undefined) player.setFontSize(fontSize)
    const linesPerBlock = resolve('linesPerBlock')
    if (linesPerBlock !== undefined) player.setLinesPerBlock(linesPerBlock)
    const contentWidth = resolve('contentWidth')
    if (contentWidth !== undefined) player.setContentWidth(contentWidth)
    const transpose = resolve('transpose')
    if (transpose !== undefined) player.setTransposeAbsolute(transpose)
    // player's setters are useCallback-stable; only re-run when the song or the loaded settings change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.id, song.playerOverrides, settings])

  const handleSaveControlAsDefault = useCallback(
    (key: PlayerOverrideKey, value: number) => {
      void updatePlayerSettings({ [key]: value })
    },
    [updatePlayerSettings]
  )

  const handleSaveControlForSong = useCallback(
    (key: PlayerOverrideKey, value: number) => {
      void updateSong({ playerOverrides: { ...song.playerOverrides, [key]: value } })
    },
    [updateSong, song.playerOverrides]
  )

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

  // Reading blocks: when linesPerBlock > 1, several consecutive sung lines
  // light up together as one unit (see groupLyricLineIndices) — computed
  // independently from the same inputs ChordOverlay uses, so both agree on
  // where a block starts/ends without any prop plumbing between them.
  const groupMembersByElementId = useMemo(() => {
    const map = new Map<string, string[]>()
    const lineIndexToElementId = autoScroll.lineIndexToElementId
    if (!lineIndexToElementId || player.state.linesPerBlock <= 1) return map
    const parsedForGrouping = parseChordPro(song.lyrics, player.state.transpose)
    const groupOf = groupLyricLineIndices(parsedForGrouping.lines, player.state.linesPerBlock)
    const byGroup = new Map<number, string[]>()
    groupOf.forEach((groupId, lineIndex) => {
      const eid = lineIndexToElementId.get(lineIndex)
      if (!eid) return
      const arr = byGroup.get(groupId) ?? []
      arr.push(eid)
      byGroup.set(groupId, arr)
    })
    byGroup.forEach((eids) => {
      eids.forEach((eid) => map.set(eid, eids))
    })
    return map
  }, [song.lyrics, player.state.transpose, player.state.linesPerBlock, autoScroll.lineIndexToElementId])

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

  // Chords are editable when stopped (drag-and-drop active)
  // Editing is an explicit choice (Edit button), never a side effect of pausing.
  const isEditable = player.state.isEditMode && !player.state.isPlaying && player.state.showChords

  const handleLyricsChange = useCallback(
    (newLyrics: string) => {
      void updateSong({ lyrics: newLyrics })
    },
    [updateSong]
  )

  useEffect(() => {
    if (player.state.isPlaying && song) {
      incrementPlayCount()
    }
  }, [player.state.isPlaying, song?.id, incrementPlayCount])

  // Keyboard navigation in setlist mode
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
                <span className={cn('w-1 h-4 rounded-full animate-pulse', isSetlistMode ? 'bg-primary' : 'bg-indigo-500')} />
                <span className={cn('w-1 h-6 rounded-full animate-pulse delay-75', isSetlistMode ? 'bg-primary' : 'bg-indigo-500')} />
                <span className={cn('w-1 h-3 rounded-full animate-pulse delay-150', isSetlistMode ? 'bg-primary' : 'bg-indigo-500')} />
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
          // Reading block: the current line's group-mates (if any) light up
          // together with it — see groupMembersByElementId above.
          const brightIds = groupMembersByElementId.get(eid) ?? [eid]
          const brightSelector = brightIds.map((id) => `[data-element-id="${id}"]`).join(', ')
          const chordIdx =
            autoScroll.currentElementStartBeat !== null
              ? Math.floor(
                  (autoScroll.currentBeat - autoScroll.currentElementStartBeat) / autoScroll.currentBeatsPerChord
                )
              : null
          return (
            <style>{`
              /* Dim all non-active lines */
              [data-element-id] {
                opacity: 0.25;
                transition: opacity 0.4s ease;
              }
              /* Active line (and its reading-block group-mates) full brightness */
              ${brightSelector} {
                opacity: 1;
              }
              ${chordIdx !== null ? `
              /* Beat follows the lyric as light, not a container highlight: */
              [data-element-id="${eid}"] [data-chord-index="${chordIdx}"] {
                color: #fff;
                text-shadow: 0 0 0.4em rgba(56, 189, 248, 0.55);
                transition: text-shadow 0.15s ease;
              }
              [data-element-id="${eid}"] [data-chord-index="${chordIdx}"] > span:first-child {
                color: rgb(56, 189, 248);
              }
              ` : ''}
            `}</style>
          )
        })()}

      {/* Lyrics Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 md:px-8 py-8"
        style={{ fontSize: `${player.state.fontSize}px` }}
      >
        <div className="mx-auto" style={{ maxWidth: `${player.state.contentWidth}px` }}>
          {player.state.showChords ? (
            <ChordOverlay
              lyrics={song.lyrics}
              transpose={player.state.transpose}
              columns={2}
              onChordClick={handleChordClick}
              isSeekEnabled={isSeekEnabled}
              isEditable={isEditable}
              onLyricsChange={handleLyricsChange}
              lineIndexToElementId={autoScroll.lineIndexToElementId ?? undefined}
              gridResolution={settings?.player.gridResolution ?? 0.25}
              linesPerBlock={player.state.linesPerBlock}
              currentElementId={autoScroll.currentElementId}
              bpm={song.bpm}
              timeSignature={song.timeSignature}
            />
          ) : (
            <LyricsDisplay lyrics={song.lyrics} />
          )}
        </div>
      </div>

      {/* Next song preview (setlist mode) */}
      {isSetlistMode && setlistContext?.nextSong && (
        <div className="px-4 pb-2 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Siguiente: <span className="text-slate-600 dark:text-slate-300">{setlistContext.nextSong.title}</span>
          </p>
        </div>
      )}

      <PlayerControls
        isPlaying={player.state.isPlaying}
        onPlayPause={player.togglePlay}
        autoScrollEnabled={player.state.isAutoScrollEnabled}
        onToggleAutoScroll={player.toggleAutoScroll}
        autoScrollSpeed={player.state.autoScrollSpeed}
        onAutoScrollSpeedChange={player.setAutoScrollSpeed}
        showChords={player.state.showChords}
        onToggleChords={player.toggleChords}
        isEditMode={player.state.isEditMode}
        onToggleEditMode={player.toggleEditMode}
        fontSize={player.state.fontSize}
        onFontSizeChange={player.setFontSize}
        linesPerBlock={player.state.linesPerBlock}
        onLinesPerBlockChange={player.setLinesPerBlock}
        contentWidth={player.state.contentWidth}
        onContentWidthChange={player.setContentWidth}
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
        onSaveControlAsDefault={handleSaveControlAsDefault}
        onSaveControlForSong={handleSaveControlForSong}
      />
    </div>
  )
}
