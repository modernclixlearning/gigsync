import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Plus, Music2, Share2, Upload, CheckSquare, X } from 'lucide-react'
import { useDiscardUntouchedNewSongs, useSongLibrary } from '~/hooks/useSongs'
import { SongCard } from '~/components/library/SongCard'
import { SongFilters } from '~/components/library/SongFilters'
import { SongSearch } from '~/components/library/SongSearch'
import { Page, PageLoading, EmptyState, buttonClass, iconButtonClass } from '~/components/layout'
import { ShareSheet } from '~/components/share/ShareSheet'
import { useGigsyncImport } from '~/components/share/useGigsyncImport'
import { selectionFile } from '~/lib/gigsyncFile'
import { routeHelpers } from '~/lib/routes'

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

  const addSongLink = (
    <Link {...routeHelpers.songNew()} className={buttonClass('primary')}>
      <Plus className="w-4 h-4" />
      <span>
        Añadir<span className="hidden sm:inline"> canción</span>
      </span>
    </Link>
  )

  if (isLoading) return <PageLoading />

  return (
    <Page
      title="Canciones"
      subtitle={`${allSongs.length} en tu repertorio`}
      actions={
        <>
          <button
            type="button"
            onClick={openPicker}
            title="Importar un fichero .gigsync"
            aria-label="Importar"
            className={iconButtonClass()}
          >
            <Upload className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => (picking ? stopPicking() : setPicking(true))}
            title={picking ? 'Salir de la selección' : 'Seleccionar canciones para compartir'}
            aria-label={picking ? 'Salir de la selección' : 'Seleccionar'}
            aria-pressed={picking}
            className={iconButtonClass(
              picking ? 'bg-indigo-100 dark:bg-indigo-500/20 text-primary dark:text-indigo-300' : undefined
            )}
          >
            {picking ? <X className="w-5 h-5" /> : <CheckSquare className="w-5 h-5" />}
          </button>
          {addSongLink}
        </>
      }
    >
      {/* Search + filters: stacked on phones, one row from tablet up */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="md:w-80 md:shrink-0">
          <SongSearch
            value={filterOptions.searchQuery}
            onChange={handleSearchChange}
            placeholder="Buscar canciones…"
          />
        </div>
        <SongFilters
          activeFilter={filterOptions.filter}
          onFilterChange={handleFilterChange}
        />
      </div>

      {filteredSongs.length === 0 ? (
        <EmptyState
          icon={<Music2 className="w-8 h-8" />}
          title={filterOptions.searchQuery ? 'Sin resultados' : 'Tu repertorio está vacío'}
          description={
            filterOptions.searchQuery
              ? 'Prueba con otro título o artista.'
              : 'Añade tu primera canción: busca la letra, pega una hoja de acordes o impórtala.'
          }
          action={filterOptions.searchQuery ? undefined : addSongLink}
        />
      ) : (
        <>
          {picking && (
            <div className="mb-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>{picked.size} seleccionada{picked.size === 1 ? '' : 's'}</span>
              <button
                type="button"
                className="font-semibold text-primary dark:text-indigo-400"
                onClick={() => setPicked(picked.size === filteredSongs.length ? new Set() : new Set(filteredSongs.map((s) => s.id)))}
              >
                {picked.size === filteredSongs.length ? 'Quitar todas' : 'Todas'}
              </button>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredSongs.map((song) =>
              picking ? (
                <SongCard
                  key={song.id}
                  song={song}
                  isSelected={picked.has(song.id)}
                  onClick={() => togglePicked(song.id)}
                />
              ) : (
                <Link key={song.id} {...routeHelpers.song(song.id)} className="block rounded-2xl">
                  <SongCard song={song} />
                </Link>
              )
            )}
          </div>
        </>
      )}

      {picking && picked.size > 0 && (
        <div className="fixed bottom-20 md:bottom-8 inset-x-0 md:left-20 lg:left-60 z-30 flex justify-center px-4">
          <button
            type="button"
            onClick={() => setShowShare(true)}
            className={buttonClass('primary', 'h-12 rounded-full px-6 shadow-lg shadow-primary/30')}
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
    </Page>
  )
}
