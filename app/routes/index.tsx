import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Music2 } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useSongLibrary } from '~/hooks/useSongs'
import { SongCard } from '~/components/library/SongCard'
import { SongFilters } from '~/components/library/SongFilters'
import { SongSearch } from '~/components/library/SongSearch'
import type { Song } from '~/types'

export const Route = createFileRoute('/')({
  component: SongsLibraryPage
})

function SongsLibraryPage() {
  const {
    filteredSongs,
    isLoading,
    filterOptions,
    setFilterOptions
  } = useSongLibrary()
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null)

  const handleSearchChange = (query: string) => {
    setFilterOptions({ searchQuery: query })
  }

  const handleFilterChange = (filter: string) => {
    setFilterOptions({ filter: filter as 'all' | 'recent' | 'favorites' })
  }

  const handleSongSelect = (song: Song) => {
    setSelectedSongId(song.id)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#101322]">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-slate-50/80 dark:bg-[#101322]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Song Library
          </h1>
          <Link
            to="/song/$songId/edit"
            params={{ songId: 'new' }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl',
              'bg-indigo-500 text-white',
              'hover:bg-indigo-600 active:bg-indigo-700',
              'transition-colors'
            )}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Song</span>
          </Link>
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-3">
        <SongSearch
          value={filterOptions.searchQuery}
          onChange={handleSearchChange}
          placeholder="Search songs..."
        />
      </div>

      {/* Filters */}
      <div className="px-4 pb-3">
        <SongFilters
          activeFilter={filterOptions.filter}
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* Song List */}
      <main className="px-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Music2 className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              No songs found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {filterOptions.searchQuery
                ? 'Try a different search term'
                : 'Add your first song to get started'}
            </p>
            <Link
              to="/song/$songId/edit"
              params={{ songId: 'new' }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl',
                'bg-indigo-500 text-white',
                'hover:bg-indigo-600',
                'transition-colors'
              )}
            >
              <Plus className="w-4 h-4" />
              <span>Add Song</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSongs.map((song) => (
              <Link
                key={song.id}
                to="/song/$songId"
                params={{ songId: song.id }}
              >
                <SongCard
                  song={song}
                  isSelected={selectedSongId === song.id}
                  onClick={() => handleSongSelect(song)}
                />
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a1f36] border-t border-slate-200 dark:border-slate-800 safe-area-pb">
        <div className="flex items-center justify-around py-2">
          <Link
            to="/"
            className={cn(
              'flex flex-col items-center gap-1 px-6 py-2 rounded-lg',
              'text-indigo-500'
            )}
          >
            <Music2 className="w-6 h-6" />
            <span className="text-xs font-medium">Library</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
