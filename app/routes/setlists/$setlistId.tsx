import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSetlist } from '~/hooks/useSetlist'
import { useSetlists } from '~/hooks/useSetlists'
import { SongItem } from '~/components/setlists/SongItem'
import { SetlistStats } from '~/components/setlists/SetlistStats'
import { SongForm } from '~/components/setlists/SongForm'
import { SetlistForm } from '~/components/setlists/SetlistForm'
import { ROUTES, routeHelpers } from '~/lib/routes'
import type { CreateSetlistInput, UpdateSetlistInput } from '~/types'

export const Route = createFileRoute('/setlists/$setlistId')({
  component: SetlistDetailPage,
})

function SetlistDetailPage() {
  const { setlistId } = Route.useParams()
  const navigate = useNavigate()
  const { setlist, songs, isLoading, removeSong, reorderSongs, addSong, updateSetlist } = useSetlist(setlistId)
  const { deleteSetlist } = useSetlists()
  const [showAddSong, setShowAddSong] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleRemoveSong = async (songId: string) => {
    try {
      setError(null)
      await removeSong(songId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove song')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || !setlist) return
    
    const oldIndex = songs.findIndex((song) => song.id === active.id)
    const newIndex = songs.findIndex((song) => song.id === over.id)
    
    if (oldIndex !== newIndex) {
      try {
        setError(null)
        const newOrder = [...setlist.songIds]
        const [moved] = newOrder.splice(oldIndex, 1)
        newOrder.splice(newIndex, 0, moved)
        await reorderSongs(newOrder)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reorder songs')
      }
    }
  }

  const handleAddSong = async (songId: string) => {
    try {
      setError(null)
      // Validate song exists
      const { db } = await import('~/lib/db')
      const song = await db.songs.get(songId)
      if (!song) {
        setError('Song not found')
        return
      }
      await addSong(songId)
      setShowAddSong(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add song')
    }
  }

  const handleEditSetlist = async (data: CreateSetlistInput) => {
    try {
      setError(null)
      const updateData: UpdateSetlistInput = {
        name: data.name,
        venue: data.venue,
        date: data.date,
      }
      await updateSetlist(updateData)
      setShowEditForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update setlist')
    }
  }

  const handleDeleteSetlist = async () => {
    try {
      setError(null)
      await deleteSetlist(setlistId)
      navigate({ to: ROUTES.SETLISTS })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete setlist')
      setShowDeleteConfirm(false)
    }
  }

  const handlePlayMode = () => {
    navigate(routeHelpers.setlistPlay(setlistId))
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
            <Link to={ROUTES.SETLISTS} className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              {setlist.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditForm(true)}
              className="px-3 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg font-medium transition-colors"
              title="Edit setlist"
            >
              <span className="material-symbols-outlined">edit</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 rounded-lg font-medium transition-colors"
              title="Delete setlist"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
            <button
              onClick={handlePlayMode}
              disabled={songs.length === 0}
              className="px-4 py-2 bg-primary text-white rounded-xl font-medium shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">play_arrow</span>
              Play
            </button>
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                Error
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {error}
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>
      )}

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={songs.map((song) => song.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {songs.map((song, index) => (
                  <SongItem
                    key={song.id}
                    song={song}
                    index={index}
                    onRemove={() => handleRemoveSong(song.id)}
                    onReorder={() => {}}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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

      {/* Edit Setlist Modal */}
      {showEditForm && (
        <SetlistForm
          setlist={setlist}
          onSubmit={handleEditSetlist}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 p-6 rounded-2xl bg-white dark:bg-[#111218] border border-slate-200 dark:border-[#3b3f54]">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Delete Setlist
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete "{setlist.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-200 dark:bg-[#232948] text-slate-900 dark:text-white font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSetlist}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
