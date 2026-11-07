import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Plus, Music2, Share2, Upload, CheckSquare, X } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useDiscardUntouchedNewSongs, useSongLibrary } from '~/hooks/useSongs'
import { SongCard } from '~/components/library/SongCard'
import { SongFilters } from '~/components/library/SongFilters'
import { SongSearch } from '~/components/library/SongSearch'
import { BottomNav } from '~/components/navigation'
import { ShareSheet } from '~/components/share/ShareSheet'
import { useGigsyncImport } from '~/components/share/useGigsyncImport'
import { selectionFile } from '~/lib/gigsyncFile'
import { routeHelpers } from '~/lib/routes'
import type { Song } from '~/types'

export const Route = createFileRoute('/')({
  component: SongsLibraryPage
})

function SongsLibraryPage() {
  const {
    songs: allSongs,
    filteredSongs,
    isLoading,
    filterOptions,
    setFilterOptions
  } = useSongLibrary()
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null)
  // «Seleccionar»: tick the songs to send (one, a few, or all of them).
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [showShare, setShowShare] = useState(false)
  const { openPicker, node: importNode } = useGigsyncImport()
  const togglePicked = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const stopPicking = () => {
    setPicking(false)
    setPicked(new Set())
  }

  // Back in the library, blank songs from "Add song" that were never filled in go away.
  const discardUntouchedNewSongs = useDiscardUntouchedNewSongs()
  useEffect(() => {
    void discardUntouchedNewSongs()
  }, [discardUntouchedNewSongs])

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
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={openPicker}
              title="Importar un fichero .gigsync"
              aria-label="Importar"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <Upload className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => (picking ? stopPicking() : setPicking(true))}
              title={picking ? 'Salir de la selección' : 'Seleccionar canciones para compartir'}
              aria-label={picking ? 'Salir de la selección' : 'Seleccionar'}
              aria-pressed={picking}
              className={cn(
                'p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800',
                picking ? 'text-indigo-500' : 'text-slate-600 dark:text-slate-300'
              )}
            >
              {picking ? <X className="w-5 h-5" /> : <CheckSquare className="w-5 h-5" />}
            </button>
          <Link
            {...routeHelpers.songNew()}
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
              {...routeHelpers.songNew()}
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
            {picking && (
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{picked.size} seleccionada{picked.size === 1 ? '' : 's'}</span>
                <button
                  type="button"
                  className="text-indigo-500 font-medium"
                  onClick={() => setPicked(picked.size === filteredSongs.length ? new Set() : new Set(filteredSongs.map((s) => s.id)))}
                >
                  {picked.size === filteredSongs.length ? 'Quitar todas' : 'Todas'}
                </button>
              </div>
            )}
            {filteredSongs.map((song) =>
              picking ? (
                <SongCard
                  key={song.id}
                  song={song}
                  isSelected={picked.has(song.id)}
                  onClick={() => togglePicked(song.id)}
                />
              ) : (
                <Link key={song.id} {...routeHelpers.song(song.id)}>
                  <SongCard
                    song={song}
                    isSelected={selectedSongId === song.id}
                    onClick={() => handleSongSelect(song)}
                  />
                </Link>
              )
            )}
          </div>
        )}
      </main>

      {picking && picked.size > 0 && (
        <div className="fixed bottom-20 inset-x-0 z-30 flex justify-center px-4">
          <button
            type="button"
            onClick={() => setShowShare(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-indigo-500 text-white font-medium shadow-lg"
          >
            <Share2 className="w-4 h-4" />
            Compartir {picked.size}
          </button>
        </div>
      )}
      {showShare && (
        <ShareSheet
          name="Selección"
          songs={allSongs.filter((song) => picked.has(song.id))}
          file={selectionFile(picked, allSongs)}
          onClose={() => {
            setShowShare(false)
            stopPicking()
          }}
        />
      )}
      {importNode}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
