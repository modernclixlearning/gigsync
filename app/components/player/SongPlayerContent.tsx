import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '~/lib/utils'
import {
  parseChordPro,
  groupLyricLineIndices,
  getTransposedKeyName,
  getTransposedPitchIndex,
  defaultPrefersFlats,
  isAmbiguousPitch,
  displayChordSpelling,
} from '~/lib/chordpro'
import { useSong, useSongPlayer } from '~/hooks/useSongs'
import { useSetlist } from '~/hooks/useSetlist'
import { useSmartAutoScroll } from '~/hooks/useSmartAutoScroll'
import { useMIDIClockSync } from '~/hooks/useMIDIClockSync'
import { useMetronomeSound } from '~/hooks/useMetronomeSound'
import { useAutoScroll } from '~/components/player/AutoScroll'
import { LyricsDisplay } from '~/components/player/LyricsDisplay'
import { ChordOverlay } from '~/components/player/ChordOverlay'
import { PlayerControls } from '~/components/player/PlayerControls'
import { PlayerAdjustments } from '~/components/player/PlayerAdjustments'
import {
  PlayerSidePanel,
  PLAYER_SIDE_PANEL_OFFSET_CLASS,
  PLAYER_SIDE_PANEL_SHEET_OFFSET_CLASS,
  type PlayerPanelTab
} from '~/components/player/PlayerSidePanel'
import { SongLiveEditor } from '~/components/player/SongLiveEditor'
import { PlayerSettings } from '~/components/profile/PlayerSettings'
import { AppearanceSettings } from '~/components/profile/AppearanceSettings'
import { VisualBeat } from '~/components/metronome/VisualBeat'
import { useSettings } from '~/hooks/useSettings'
import { BeatIndicator } from '~/components/player/BeatIndicator'
import { YouTubePlayAlong } from '~/components/player/YouTubePlayAlong'
import { normalizeStartSeconds, parseYouTubeUrl } from '~/lib/youtube'
import type { Song, PlayerOverrideKey, PlayerOverrideValue, PlayerOverrides } from '~/types'
import { DEFAULT_MIDI_CLOCK_SYNC } from '~/types/profile'
import { useCountIn } from '~/hooks/useCountIn'
import { isSongFinished, resolvePlaybackPreferences } from '~/lib/playback'
import { AutoAdvanceBanner } from '~/components/player/AutoAdvanceBanner'
import { beatHighlightCss, chordColorsCss, pickupHighlightCss } from '~/components/player/beatHighlightCss'

export interface SetlistContext {
  setlistId: string
  setlistName?: string
  currentIndex: number
  totalSongs: number
  nextSong?: Song
  onPrevious: () => void
  /** `autoStart`: the next song starts by itself (with the count-in) once it's loaded. */
  onNext: (options?: { autoStart?: boolean }) => void
  onExit: () => void
  /** This song was reached by auto-advance: start it with the count-in on load. */
  autoStart?: boolean
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
  const { settings, updateSettings, updatePlayerSettings } = useSettings()
  const { setlist, updateSetlist } = useSetlist(setlistContext?.setlistId ?? '')

  // Side panel (Ajustes / Editar / Config): docked next to the song so every
  // change is visible on it while being made.
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<PlayerPanelTab>('adjust')
  const isPanelOpenRef = useRef(isPanelOpen)
  isPanelOpenRef.current = isPanelOpen
  const openPanel = useCallback((tab: PlayerPanelTab) => {
    setPanelTab(tab)
    setIsPanelOpen(true)
  }, [])
  const closePanel = useCallback(() => setIsPanelOpen(false), [])
  const togglePanel = useCallback(() => setIsPanelOpen((open) => !open), [])

  const smartScrollContextWindowPercent =
    settings?.player.smartScrollContextWindow ?? 50
  const smartScrollSmoothness =
    settings?.player.smartScrollSmoothness ?? 70
  const showBeatIndicatorDebug =
    settings?.player.showBeatIndicatorDebug ?? false

  // Apply this song's own control overrides (if any), else the setlist's
  // (if opened from one), else the global defaults saved via "Usar como
  // default", once per song load. Guarded by ref so a later
  // settings/song/setlist refetch (e.g. right after saving) doesn't stomp
  // on a value the user is actively adjusting live.
  const appliedOverridesForSongRef = useRef<string | null>(null)
  useEffect(() => {
    if (!settings) return
    if (appliedOverridesForSongRef.current === song.id) return
    appliedOverridesForSongRef.current = song.id

    const overrides = song.playerOverrides
    const setlistOverrides = setlist?.playerOverrides
    const resolve = <K extends PlayerOverrideKey>(key: K): PlayerOverrideValue<K> | undefined =>
      (overrides?.[key] ?? setlistOverrides?.[key] ?? settings.player[key]) as PlayerOverrideValue<K> | undefined

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
    const chordFontSize = resolve('chordFontSize')
    if (chordFontSize !== undefined) player.setChordFontSize(chordFontSize)
    const beatHighlightMode = resolve('beatHighlightMode')
    if (beatHighlightMode !== undefined) player.setBeatHighlightMode(beatHighlightMode)
    const beatHighlightTextColor = resolve('beatHighlightTextColor')
    if (beatHighlightTextColor !== undefined) player.setBeatHighlightTextColor(beatHighlightTextColor)
    const beatHighlightBgColor = resolve('beatHighlightBgColor')
    if (beatHighlightBgColor !== undefined) player.setBeatHighlightBgColor(beatHighlightBgColor)
    const beatHighlightGlowIntensity = resolve('beatHighlightGlowIntensity')
    if (beatHighlightGlowIntensity !== undefined) player.setBeatHighlightGlowIntensity(beatHighlightGlowIntensity)
    const beatHighlightGlowColor = resolve('beatHighlightGlowColor')
    if (beatHighlightGlowColor !== undefined) player.setBeatHighlightGlowColor(beatHighlightGlowColor)
    const chordHighlightMode = resolve('chordHighlightMode')
    if (chordHighlightMode !== undefined) player.setChordHighlightMode(chordHighlightMode)
    const chordTextColor = resolve('chordTextColor')
    if (chordTextColor !== undefined) player.setChordTextColor(chordTextColor)
    const chordBgColor = resolve('chordBgColor')
    if (chordBgColor !== undefined) player.setChordBgColor(chordBgColor)
    const backgroundColor = resolve('backgroundColor')
    if (backgroundColor !== undefined) player.setBackgroundColor(backgroundColor)
    const lyricsTextColor = resolve('lyricsTextColor')
    if (lyricsTextColor !== undefined) player.setLyricsTextColor(lyricsTextColor)
    // player's setters are useCallback-stable; only re-run when the song, the loaded settings, or the setlist overrides change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.id, song.playerOverrides, settings, setlist?.playerOverrides])

  const handleSaveControlAsDefault = useCallback(
    (key: PlayerOverrideKey, value: number | string) => {
      void updatePlayerSettings({ [key]: value })
    },
    [updatePlayerSettings]
  )

  const handleSaveControlForSong = useCallback(
    (key: PlayerOverrideKey, value: number | string) => {
      void updateSong({ playerOverrides: { ...song.playerOverrides, [key]: value } })
    },
    [updateSong, song.playerOverrides]
  )

  const canSaveForSetlist = !!setlistContext
  const handleSaveControlForSetlist = useCallback(
    (key: PlayerOverrideKey, value: number | string) => {
      if (!setlistContext) return
      void updateSetlist({ playerOverrides: { ...setlist?.playerOverrides, [key]: value } })
    },
    [setlistContext, updateSetlist, setlist?.playerOverrides]
  )

  // Some settings rows bundle several override keys behind one save button
  // (e.g. beat highlight mode + its two colors, or background + lyrics
  // color) — saving them one key at a time via the handlers above would
  // race, since each call reads the same not-yet-updated `song`/`setlist`
  // snapshot and would clobber the previous key's write.
  const handleSaveControlsAsDefault = useCallback(
    (values: Partial<PlayerOverrides>) => {
      void updatePlayerSettings(values)
    },
    [updatePlayerSettings]
  )

  const handleSaveControlsForSong = useCallback(
    (values: Partial<PlayerOverrides>) => {
      void updateSong({ playerOverrides: { ...song.playerOverrides, ...values } })
    },
    [updateSong, song.playerOverrides]
  )

  const handleSaveControlsForSetlist = useCallback(
    (values: Partial<PlayerOverrides>) => {
      if (!setlistContext) return
      void updateSetlist({ playerOverrides: { ...setlist?.playerOverrides, ...values } })
    },
    [setlistContext, updateSetlist, setlist?.playerOverrides]
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

  // External sync: follow a DAW's MIDI Clock (opt-in). It only feeds the one
  // existing Tone.Transport (tempo) and the player's play/pause (transport
  // events) — autoscroll and the metronome keep following that transport,
  // there's no second clock. Callbacks read refs because they fire from MIDI
  // events, outside React's render cycle.
  const midiClockPrefs = settings?.midiClockSync ?? DEFAULT_MIDI_CLOCK_SYNC
  const playerRef = useRef(player)
  playerRef.current = player
  const resetTransportRef = useRef<() => void>(() => {})
  // Bumped whenever the transport restarts from the top, so the play-along
  // video jumps back to its start offset too.
  const [videoRestartKey, setVideoRestartKey] = useState(0)

  const startFromMidi = useCallback((fromTop: boolean) => {
    const p = playerRef.current
    if (fromTop) {
      resetTransportRef.current()
      setVideoRestartKey((k) => k + 1)
    }
    if (!p.state.isPlaying) {
      // togglePlay also turns autoscroll on, which is what runs the transport.
      void p.togglePlay()
    } else if (!p.state.isAutoScrollEnabled) {
      p.toggleAutoScroll()
    }
  }, [])

  const midiClock = useMIDIClockSync({
    enabled: midiClockPrefs.enabled,
    inputName: midiClockPrefs.inputName,
    onStart: () => startFromMidi(true),
    onContinue: () => startFromMidi(false),
    onStop: () => {
      if (playerRef.current.state.isPlaying) playerRef.current.pause()
    }
  })

  const autoScroll = useSmartAutoScroll({
    lyrics: song.lyrics || '',
    bpm: song.bpm || 120,
    timeSignature: song.timeSignature || '4/4',
    isPlaying: player.state.isPlaying,
    isEnabled: player.state.isAutoScrollEnabled,
    containerRef: scrollContainerRef,
    contextWindowRatio: clamp(smartScrollContextWindowPercent, 0, 100) / 100,
    smoothScrollDuration: mapSmoothnessToDuration(smartScrollSmoothness),
    transportBpm: midiClock.bpm,
    calculationOptions: {
      defaultBarsPerLine: 2,
      defaultBeatsPerChord: 4,
      intelligentEstimation: false
    }
  })

  resetTransportRef.current = autoScroll.reset

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

  // ── Transport: restart, count-in, end of song, next song ──────────────────
  const playbackPrefs = resolvePlaybackPreferences(settings?.player)
  const countIn = useCountIn()
  const [isAdvancePending, setIsAdvancePending] = useState(false)
  const autoScrollPlay = autoScroll.play
  const autoScrollReset = autoScroll.reset
  const cancelCountIn = countIn.cancel

  // After a song ends the transport sits on its last beat: playing again
  // (or counting in) starts over from the top instead of stopping at once.
  const isAtEndRef = useRef(false)
  isAtEndRef.current = isSongFinished(autoScroll.currentBeat, autoScroll.totalBeats)
  const rewindIfFinished = useCallback(() => {
    if (!playerRef.current.state.isPlaying && isAtEndRef.current) {
      autoScrollReset()
      setVideoRestartKey((k) => k + 1)
    }
  }, [autoScrollReset])

  const handlePlayPause = useCallback(() => {
    cancelCountIn()
    setIsAdvancePending(false)
    rewindIfFinished()
    return playerRef.current.togglePlay()
  }, [cancelCountIn, rewindIfFinished])

  // Back to the top: transport, lyrics and play-along video. Keeps playing if
  // it was playing (reset stops the transport, so it's started again).
  const handleRestart = useCallback(() => {
    cancelCountIn()
    setIsAdvancePending(false)
    autoScrollReset()
    setVideoRestartKey((k) => k + 1)
    scrollContainerRef.current?.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })
    const p = playerRef.current
    if (p.state.isPlaying && p.state.isAutoScrollEnabled) void autoScrollPlay()
  }, [cancelCountIn, autoScrollReset, autoScrollPlay])

  const countInBpm = midiClock.bpm ?? (song.bpm || 120)
  const startCountIn = useCallback(() => {
    if (playerRef.current.state.isPlaying) return
    setIsAdvancePending(false)
    rewindIfFinished()
    void countIn.start({
      bpm: countInBpm,
      beatsPerBar,
      bars: playbackPrefs.countInBars,
      onDone: () => {
        if (!playerRef.current.state.isPlaying) void playerRef.current.togglePlay()
      },
    })
  }, [countIn.start, countInBpm, beatsPerBar, playbackPrefs.countInBars, rewindIfFinished])

  const handleCountInPlay = useCallback(() => {
    if (countIn.isCountingIn) cancelCountIn()
    else startCountIn()
  }, [countIn.isCountingIn, cancelCountIn, startCountIn])

  const hasNextSong = !!setlistContext && setlistContext.currentIndex < setlistContext.totalSongs - 1
  const goToNextSong = useCallback(
    (autoStart = false) => {
      if (!setlistContext || setlistContext.currentIndex >= setlistContext.totalSongs - 1) return
      cancelCountIn()
      setIsAdvancePending(false)
      playerRef.current.pause()
      autoScrollReset()
      setlistContext.onNext(autoStart ? { autoStart: true } : undefined)
    },
    [setlistContext, cancelCountIn, autoScrollReset]
  )

  // End of the song: stop there (the transport would otherwise keep counting
  // past the last line). In a setlist with auto-advance on, queue the next one.
  const hasSongFinished =
    player.state.isPlaying &&
    player.state.isAutoScrollEnabled &&
    autoScroll.isReady &&
    !autoScroll.hasFallback &&
    isSongFinished(autoScroll.currentBeat, autoScroll.totalBeats)
  useEffect(() => {
    if (!hasSongFinished) return
    playerRef.current.pause()
    if (hasNextSong && playbackPrefs.autoAdvance) setIsAdvancePending(true)
  }, [hasSongFinished, hasNextSong, playbackPrefs.autoAdvance])

  // Reached by auto-advance: start with the count-in once settings and the
  // timeline are loaded (once per song).
  const hasAutoStartedRef = useRef(false)
  useEffect(() => {
    if (!setlistContext?.autoStart || hasAutoStartedRef.current) return
    if (!settings || !autoScroll.isReady) return
    hasAutoStartedRef.current = true
    startCountIn()
  }, [setlistContext?.autoStart, settings, autoScroll.isReady, startCountIn])

  // Transpose target: which chromatic pitch the song's key lands on, and
  // whether to spell it with sharps or flats. A manual override
  // (transposePreferFlats) wins; otherwise default to whichever spelling
  // has fewer accidentals for that pitch (see defaultPrefersFlats).
  const targetPitchIndex = useMemo(
    () => getTransposedPitchIndex(song.key, player.state.transpose),
    [song.key, player.state.transpose]
  )
  const isTransposeSpellingFlexible = targetPitchIndex !== -1 && isAmbiguousPitch(targetPitchIndex)
  const effectiveUseFlats =
    player.state.transposePreferFlats ??
    (targetPitchIndex === -1 ? false : defaultPrefersFlats(targetPitchIndex))
  const transposeDisplay = getTransposedKeyName(song.key, player.state.transpose, effectiveUseFlats)
  const handleToggleTransposeSpelling = useCallback(() => {
    player.setTransposePreferFlats(!effectiveUseFlats)
  }, [player.setTransposePreferFlats, effectiveUseFlats])

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
      // Typing in a text field (lyric/section editor): space and arrows are text.
      const t = e.target
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        (t instanceof HTMLElement && t.isContentEditable)
      ) {
        return
      }
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
      // With the side panel open, Escape closes the panel (PlayerSidePanel), not the setlist.
      if (e.key === 'Escape' && !isPanelOpenRef.current) {
        setlistContext.onExit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setlistContext, player, autoScroll])

  // YouTube play-along (#38). No play state of its own: the video follows
  // player.state.isPlaying — the same flag Play/Pause, the setlist keyboard
  // shortcuts and the MIDI Clock Start/Continue/Stop drive — so video and
  // autoscroll always start/stop together. Tempo stays the song's BPM.
  const youtubeVideo = useMemo(() => parseYouTubeUrl(song.youtubeUrl), [song.youtubeUrl])
  const [videoStartSeconds, setVideoStartSeconds] = useState(() =>
    normalizeStartSeconds(song.youtubeStartSeconds)
  )
  useEffect(() => {
    setVideoStartSeconds(normalizeStartSeconds(song.youtubeStartSeconds))
  }, [song.id, song.youtubeStartSeconds])
  const handleVideoStartChange = useCallback(
    (seconds: number) => {
      setVideoStartSeconds(seconds)
      void updateSong({ youtubeStartSeconds: seconds })
    },
    [updateSong]
  )
  const handleVideoPausedByUser = useCallback(() => {
    if (playerRef.current.state.isPlaying) playerRef.current.pause()
  }, [])

  const isSetlistMode = !!setlistContext

  return (
    <div
      className={cn(
        // Fixed to the viewport so the lyrics container below is what scrolls
        // (autoscroll moves that container, not the window).
        'h-dvh overflow-hidden flex flex-col',
        isSetlistMode ? 'dark bg-[#05060b]' : 'bg-slate-50 dark:bg-[#101322]',
        isPanelOpen && [PLAYER_SIDE_PANEL_OFFSET_CLASS, PLAYER_SIDE_PANEL_SHEET_OFFSET_CLASS]
      )}
      style={player.state.backgroundColor ? { backgroundColor: player.state.backgroundColor } : undefined}
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
            <button
              type="button"
              onClick={() => (isPanelOpen && panelTab === 'edit' ? closePanel() : openPanel('edit'))}
              aria-label="Editar canción"
              title="Editar canción"
              className={cn(
                'p-2 rounded-lg transition-colors',
                isPanelOpen && panelTab === 'edit'
                  ? 'text-indigo-500 dark:text-indigo-400'
                  : isSetlistMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Settings className="w-5 h-5" />
            </button>
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
            {player.state.transpose === 0 ? song.key : `${song.key} → ${transposeDisplay}`}
          </span>
          <span>•</span>
          {midiClock.status === 'listening' ? (
            <span
              title={`Siguiendo el MIDI Clock de "${midiClock.activeInputName ?? ''}"`}
              className="text-indigo-500 dark:text-indigo-400"
            >
              {midiClock.bpm !== null ? `${Math.round(midiClock.bpm)} BPM` : 'Esperando clock'} · MIDI
            </span>
          ) : (
            <span>{song.bpm} BPM</span>
          )}
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

      {/* MIDI Clock sync couldn't start — informative only, playback keeps the song's BPM */}
      {midiClock.message && (
        <p
          role="status"
          className="mx-4 mt-3 px-3 py-2 rounded-lg text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
        >
          🎛️ {midiClock.message}
        </p>
      )}

      {youtubeVideo && (
        <YouTubePlayAlong
          key={song.id}
          videoId={youtubeVideo.videoId}
          startSeconds={videoStartSeconds}
          isPlaying={player.state.isPlaying}
          restartKey={videoRestartKey}
          onStartSecondsChange={handleVideoStartChange}
          onVideoPausedByUser={handleVideoPausedByUser}
        />
      )}

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
          // Reading block: the current line's group-mates (if any) are the
          // other original lines fused onto its row — they get a mid
          // brightness (readable, but clearly not the active one), while
          // everything outside the row stays fully dimmed.
          const groupMateIds = (groupMembersByElementId.get(eid) ?? [eid]).filter((id) => id !== eid)
          const groupMateSelector = groupMateIds.map((id) => `[data-element-id="${id}"]`).join(', ')
          const highlightStyle = {
            lyricMode: player.state.beatHighlightMode,
            chordMode: player.state.chordHighlightMode ?? player.state.beatHighlightMode,
            textColor: player.state.beatHighlightTextColor,
            bgColor: player.state.beatHighlightBgColor,
            glowColor: player.state.beatHighlightGlowColor ?? player.state.beatHighlightTextColor,
            glowIntensity: player.state.beatHighlightGlowIntensity,
          }
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
              ${groupMateSelector ? `
              /* Reading-block group-mates: readable, but not the active line */
              ${groupMateSelector} {
                opacity: 0.6;
              }
              ` : ''}
              /* Active line: full brightness */
              [data-element-id="${eid}"] {
                opacity: 1;
              }
              ${chordIdx !== null ? beatHighlightCss(eid, chordIdx, highlightStyle) : ''}
              ${autoScroll.pickupElementId ? pickupHighlightCss(autoScroll.pickupElementId, highlightStyle) : ''}
            `}</style>
          )
        })()}

      {/* Chord label colors (Ajustes → Colores de acordes) */}
      {(player.state.chordTextColor || player.state.chordBgColor) && (
        <style>{chordColorsCss('[data-gs-lyrics]', player.state.chordTextColor, player.state.chordBgColor)}</style>
      )}

      {/* Lyrics Container */}
      <div
        ref={scrollContainerRef}
        data-gs-lyrics
        className="min-h-0 flex-1 overflow-y-auto px-6 md:px-8 py-8"
        style={{
          fontSize: `${player.state.fontSize}px`,
          ...(player.state.lyricsTextColor ? { color: player.state.lyricsTextColor } : {})
        }}
      >
        <div className="mx-auto" style={{ maxWidth: `${player.state.contentWidth}px` }}>
          {player.state.showChords ? (
            <ChordOverlay
              lyrics={song.lyrics}
              transpose={player.state.transpose}
              preferFlats={displayChordSpelling(player.state.transpose, player.state.transposePreferFlats, effectiveUseFlats)}
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
              chordFontSize={player.state.chordFontSize}
              lyricsTextColor={player.state.lyricsTextColor}
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

      {/* Count-in: big beat number over the song */}
      {countIn.count !== null && (
        <div
          aria-live="assertive"
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
        >
          <span className="text-[10rem] font-black leading-none text-indigo-500/80 tabular-nums drop-shadow-lg">
            {countIn.count}
          </span>
        </div>
      )}

      {isAdvancePending && setlistContext?.nextSong && (
        <AutoAdvanceBanner
          nextTitle={setlistContext.nextSong.title}
          delaySeconds={playbackPrefs.autoAdvanceDelaySeconds}
          onAdvance={() => goToNextSong(true)}
          onCancel={() => setIsAdvancePending(false)}
        />
      )}

      <PlayerControls
        isPlaying={player.state.isPlaying}
        onPlayPause={handlePlayPause}
        autoScrollEnabled={player.state.isAutoScrollEnabled}
        onToggleAutoScroll={player.toggleAutoScroll}
        showChords={player.state.showChords}
        onToggleChords={player.toggleChords}
        isEditMode={player.state.isEditMode}
        onToggleEditMode={player.toggleEditMode}
        transpose={player.state.transpose}
        onResetTranspose={player.resetTranspose}
        metronomeSoundEnabled={player.state.metronomeSoundEnabled}
        onToggleMetronomeSound={player.toggleMetronomeSound}
        isSettingsOpen={isPanelOpen}
        onToggleSettings={togglePanel}
        onRestart={handleRestart}
        onCountInPlay={handleCountInPlay}
        isCountingIn={countIn.isCountingIn}
        onNextSong={hasNextSong ? () => goToNextSong() : undefined}
      />

      <PlayerSidePanel
        isOpen={isPanelOpen}
        tab={panelTab}
        onTabChange={setPanelTab}
        onClose={closePanel}
        content={{
          adjust: (
            <PlayerAdjustments
              autoScrollSpeed={player.state.autoScrollSpeed}
              onAutoScrollSpeedChange={player.setAutoScrollSpeed}
              fontSize={player.state.fontSize}
              onFontSizeChange={player.setFontSize}
              linesPerBlock={player.state.linesPerBlock}
              onLinesPerBlockChange={player.setLinesPerBlock}
              contentWidth={player.state.contentWidth}
              onContentWidthChange={player.setContentWidth}
              transpose={player.state.transpose}
              onTranspose={player.transpose}
              onResetTranspose={player.resetTranspose}
              transposeDisplay={transposeDisplay}
              transposePreferFlats={effectiveUseFlats}
              isTransposeSpellingFlexible={isTransposeSpellingFlexible}
              onToggleTransposeSpelling={handleToggleTransposeSpelling}
              smartScrollContextWindow={smartScrollContextWindowPercent}
              onSmartScrollContextWindowChange={handleContextWindowChange}
              smartScrollSmoothness={smartScrollSmoothness}
              onSmartScrollSmoothnessChange={handleSmoothnessChange}
              showBeatIndicatorDebug={showBeatIndicatorDebug}
              onToggleBeatIndicatorDebug={handleToggleBeatIndicator}
              onSaveControlAsDefault={handleSaveControlAsDefault}
              onSaveControlForSong={handleSaveControlForSong}
              onSaveControlForSetlist={handleSaveControlForSetlist}
              onSaveControlsAsDefault={handleSaveControlsAsDefault}
              onSaveControlsForSong={handleSaveControlsForSong}
              onSaveControlsForSetlist={handleSaveControlsForSetlist}
              canSaveForSetlist={canSaveForSetlist}
              chordFontSize={player.state.chordFontSize}
              onChordFontSizeChange={player.setChordFontSize}
              beatHighlightMode={player.state.beatHighlightMode}
              onBeatHighlightModeChange={player.setBeatHighlightMode}
              beatHighlightTextColor={player.state.beatHighlightTextColor}
              onBeatHighlightTextColorChange={player.setBeatHighlightTextColor}
              beatHighlightBgColor={player.state.beatHighlightBgColor}
              onBeatHighlightBgColorChange={player.setBeatHighlightBgColor}
              beatHighlightGlowIntensity={player.state.beatHighlightGlowIntensity}
              onBeatHighlightGlowIntensityChange={player.setBeatHighlightGlowIntensity}
              beatHighlightGlowColor={player.state.beatHighlightGlowColor}
              onBeatHighlightGlowColorChange={player.setBeatHighlightGlowColor}
              chordHighlightMode={player.state.chordHighlightMode ?? player.state.beatHighlightMode}
              onChordHighlightModeChange={player.setChordHighlightMode}
              chordTextColor={player.state.chordTextColor}
              onChordTextColorChange={player.setChordTextColor}
              chordBgColor={player.state.chordBgColor}
              onChordBgColorChange={player.setChordBgColor}
              backgroundColor={player.state.backgroundColor}
              onBackgroundColorChange={player.setBackgroundColor}
              lyricsTextColor={player.state.lyricsTextColor}
              onLyricsTextColorChange={player.setLyricsTextColor}
            />
          ),
          edit: (
            <SongLiveEditor
              key={song.id}
              song={song}
              onSave={updateSong}
              isChordEditMode={player.state.isEditMode}
              onToggleChordEditMode={
                player.state.showChords && !player.state.isPlaying ? player.toggleEditMode : undefined
              }
            />
          ),
          config: settings ? (
            <div className="space-y-8">
              <PlayerSettings settings={settings.player} onUpdate={updatePlayerSettings} />
              <AppearanceSettings
                settings={settings}
                onThemeChange={(theme) => updateSettings({ theme })}
                onLanguageChange={(language) => updateSettings({ language })}
              />
            </div>
          ) : null
        }}
      />
    </div>
  )
}
