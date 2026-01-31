import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useSetlist } from '~/hooks/useSetlist'
import { SongItem } from '~/components/setlists/SongItem'
import { SetlistStats } from '~/components/setlists/SetlistStats'
import { SongForm } from '~/components/setlists/SongForm'

export const Route = createFileRoute('/setlists/$setlistId')({
  component: SetlistDetailPage,
})

function SetlistDetailPage() {
  const { setlistId } = Route.useParams()
  const navigate = useNavigate()
  const { setlist, songs, isLoading, removeSong, reorderSongs, addSong } = useSetlist(setlistId)
  const [showAddSong, setShowAddSong] = useState(false)

  const handleRemoveSong = async (songId: string) => {
    await removeSong(songId)
  }

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (!setlist) return
    const newOrder = [...setlist.songIds]
    const [moved] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, moved)
    await reorderSongs(newOrder)
  }

  const handleAddSong = async (songId: string) => {
    await addSong(songId)
    setShowAddSong(false)
  }

  const handlePlayMode = () => {
    navigate({ to: '/setlists/$setlistId/play', params: { setlistId } })
  }

  if (isLoading || !setlist) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#101322] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#101322]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-50/80 dark:bg-[#101322]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/setlists" className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              {setlist.name}
            </h1>
          </div>
          <button
            onClick={handlePlayMode}
            disabled={songs.length === 0}
            className="px-4 py-2 bg-primary text-white rounded-xl font-medium shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">play_arrow</span>
            Play
          </button>
        </div>
      </header>

      {/* Stats */}
      <SetlistStats
        songCount={songs.length}
        totalDuration={setlist.totalDuration}
        venue={setlist.venue}
        date={setlist.date}
      />

      {/* Songs List */}
      <main className="px-4 py-4 pb-24">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Songs ({songs.length})
          </h2>
          <button
            onClick={() => setShowAddSong(true)}
            className="px-3 py-1.5 text-sm bg-slate-200 dark:bg-[#232948] text-slate-900 dark:text-white rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-[#2a3155] transition-colors"
          >
            + Add Song
          </button>
        </div>
        
        {songs.length === 0 ? (
          <p className="text-center text-slate-400 py-8">
            No songs in this setlist yet
          </p>
        ) : (
          <div className="space-y-2">
            {songs.map((song, index) => (
              <SongItem
                key={song.id}
                song={song}
                index={index}
                onRemove={() => handleRemoveSong(song.id)}
                onReorder={handleReorder}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Song Modal */}
      {showAddSong && (
        <SongForm
          excludeSongIds={setlist.songIds}
          onSubmit={handleAddSong}
          onCancel={() => setShowAddSong(false)}
        />
      )}
    </div>
  )
}
