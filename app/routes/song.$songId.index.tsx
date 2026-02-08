import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { ArrowLeft, Settings, Play, Pause, Music2 } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useSong, useSongPlayer } from '~/hooks/useSongs'
import { LyricsDisplay } from '~/components/player/LyricsDisplay'
import { ChordOverlay } from '~/components/player/ChordOverlay'
import { PlayerControls } from '~/components/player/PlayerControls'
import { useAutoScroll } from '~/components/player/AutoScroll'
import { ROUTES, routeHelpers } from '~/lib/routes'

export const Route = createFileRoute('/song/$songId/')({
  component: SongPlayerPage
})

function SongPlayerPage() {
  const { songId } = Route.useParams()
  const navigate = useNavigate()
  const { song, isLoading, incrementPlayCount } = useSong(songId)
  const player = useSongPlayer()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll hook
  useAutoScroll({
    containerRef: scrollContainerRef,
    isEnabled: player.state.isAutoScrollEnabled && player.state.isPlaying,
    speed: player.state.autoScrollSpeed
  })

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
        </div>
      </header>

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
      />
    </div>
  )
}
