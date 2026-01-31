import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '~/lib/utils'
import { db } from '~/lib/db'
import type { Song } from '~/types'

interface SongFormProps {
  excludeSongIds?: string[]
  onSubmit: (songId: string) => void
  onCancel: () => void
}

export function SongForm({ excludeSongIds = [], onSubmit, onCancel }: SongFormProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null)

  // Query: Fetch all songs
  const { data: allSongs = [], isLoading } = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      return await db.songs.orderBy('title').toArray()
    }
  })

  // Filter songs based on search and exclude already added songs
  const availableSongs = allSongs.filter(song => {
    if (excludeSongIds.includes(song.id)) return false
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      song.title.toLowerCase().includes(query) ||
      song.artist.toLowerCase().includes(query)
    )
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedSongId) {
      onSubmit(selectedSongId)
    }
  }

  const handleSongClick = (songId: string) => {
    setSelectedSongId(songId)
  }

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 p-6 rounded-2xl bg-white dark:bg-[#111218] border border-slate-200 dark:border-[#3b3f54] max-h-[80vh] flex flex-col">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Add Song to Setlist
        </h2>

        {/* Search Input */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs..."
            className={cn(
              'w-full px-4 py-3 rounded-xl border-none',
              'bg-slate-100 dark:bg-[#282b39]',
              'text-slate-900 dark:text-white',
              'placeholder:text-slate-400 dark:placeholder:text-[#9da1b9]',
              'focus:outline-none focus:ring-2 focus:ring-primary'
            )}
          />
        </div>

        {/* Song List */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : availableSongs.length === 0 ? (
            <p className="text-center text-slate-400 py-8">
              {searchQuery ? 'No songs found' : 'No songs available'}
            </p>
          ) : (
            availableSongs.map(song => (
              <button
                key={song.id}
                type="button"
                onClick={() => handleSongClick(song.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl text-left',
                  'border transition-colors',
                  selectedSongId === song.id
                    ? 'border-primary bg-primary/10'
                    : 'border-slate-200 dark:border-[#3b3f54] hover:bg-slate-50 dark:hover:bg-white/5'
                )}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900 dark:text-white truncate">
                    {song.title}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                    {song.artist}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span>{song.bpm} BPM</span>
                  <span>{formatDuration(song.duration)}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Actions */}
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-200 dark:bg-[#232948] text-slate-900 dark:text-white font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedSongId}
              className={cn(
                'flex-1 px-4 py-3 rounded-xl font-medium',
                selectedSongId
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
              )}
            >
              Add Song
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
