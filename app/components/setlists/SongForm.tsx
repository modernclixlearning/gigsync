import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { cn } from '~/lib/utils'
import { db } from '~/lib/db'
import { Dialog, buttonClass, fieldClass } from '~/components/layout'

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

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <Dialog title="Añadir canción al setlist" size="lg" onClose={onCancel}>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Buscar canciones…"
        aria-label="Buscar canciones"
        className={cn(fieldClass, 'mb-3 shrink-0')}
      />

      <div className="min-h-32 flex-1 overflow-y-auto space-y-2 mb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        ) : availableSongs.length === 0 ? (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">
            {searchQuery ? 'Sin resultados' : 'No quedan canciones por añadir'}
          </p>
        ) : (
          availableSongs.map(song => {
            const selected = selectedSongId === song.id
            return (
              <button
                key={song.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedSongId(song.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl text-left',
                  'border transition-colors',
                  selected
                    ? 'border-primary bg-indigo-50 dark:bg-indigo-500/10'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-white/5'
                )}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900 dark:text-white truncate">
                    {song.title}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                    {song.artist || 'Sin artista'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm tabular-nums text-slate-500 dark:text-slate-400">
                  <span>{song.bpm} BPM</span>
                  <span>{formatDuration(song.duration)}</span>
                  {selected && <Check className="w-4 h-4 text-primary dark:text-indigo-400" />}
                </div>
              </button>
            )
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex shrink-0 gap-3">
        <button type="button" onClick={onCancel} className={buttonClass('secondary', 'flex-1')}>
          Cancelar
        </button>
        <button type="submit" disabled={!selectedSongId} className={buttonClass('primary', 'flex-1')}>
          Añadir
        </button>
      </form>
    </Dialog>
  )
}
