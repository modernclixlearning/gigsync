import { createFileRoute, Outlet, useChildMatches, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ListMusic, Pencil, Play, Plus, Share2, Trash2 } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSetlist } from '~/hooks/useSetlist'
import { useSetlists } from '~/hooks/useSetlists'
import { SongItem } from '~/components/setlists/SongItem'
import { SetlistStats } from '~/components/setlists/SetlistStats'
import { SongForm } from '~/components/setlists/SongForm'
import { SetlistForm } from '~/components/setlists/SetlistForm'
import { Page, PageLoading, Dialog, EmptyState, ErrorBanner, SectionTitle, buttonClass, iconButtonClass } from '~/components/layout'
import { ShareSheet } from '~/components/share/ShareSheet'
import { setlistFile } from '~/lib/gigsyncFile'
import { ROUTES, routeHelpers } from '~/lib/routes'
import type { CreateSetlistInput, UpdateSetlistInput } from '~/types'

export const Route = createFileRoute('/setlists/$setlistId')({
  component: SetlistRoute,
})

/**
 * `/setlists/$setlistId/play` is a child of this route, so it only renders
 * through an <Outlet />. Without one, the detail page kept rendering and the
 * live setlist player never showed up.
 */
function SetlistRoute() {
  const childMatches = useChildMatches()
  return childMatches.length > 0 ? <Outlet /> : <SetlistDetailPage />
}

function SetlistDetailPage() {
  const { setlistId } = Route.useParams()
  const navigate = useNavigate()
  const { setlist, songs, isLoading, removeSong, reorderSongs, addSong, updateSetlist } = useSetlist(setlistId)
  const { deleteSetlist } = useSetlists()
  const [showAddSong, setShowAddSong] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showShare, setShowShare] = useState(false)
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
      setError(err instanceof Error ? err.message : 'No se pudo quitar la canción')
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
        setError(err instanceof Error ? err.message : 'No se pudo reordenar')
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
        setError('No se encontró la canción')
        return
      }
      await addSong(songId)
      setShowAddSong(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo añadir la canción')
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
      setError(err instanceof Error ? err.message : 'No se pudo guardar el setlist')
    }
  }

  const handleDeleteSetlist = async () => {
    try {
      setError(null)
      await deleteSetlist(setlistId)
      navigate({ to: ROUTES.SETLISTS })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el setlist')
      setShowDeleteConfirm(false)
    }
  }

  const handlePlayMode = () => {
    navigate(routeHelpers.setlistPlay(setlistId))
  }

  if (isLoading || !setlist) return <PageLoading />

  return (
    <Page
      title={setlist.name}
      backTo={ROUTES.SETLISTS}
      actions={
        <>
          <button type="button" onClick={() => setShowShare(true)} aria-label="Compartir setlist" title="Compartir setlist" className={iconButtonClass()}>
            <Share2 className="w-5 h-5" />
          </button>
          <button type="button" onClick={() => setShowEditForm(true)} aria-label="Editar setlist" title="Editar setlist" className={iconButtonClass()}>
            <Pencil className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Eliminar setlist"
            title="Eliminar setlist"
            className={iconButtonClass('text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40')}
          >
            <Trash2 className="w-5 h-5" />
          </button>
          {/* On phones the primary action lives in the thumb zone (see the bar below) */}
          <button
            type="button"
            onClick={handlePlayMode}
            disabled={songs.length === 0}
            className={buttonClass('primary', 'hidden sm:inline-flex')}
          >
            <Play className="w-4 h-4 fill-current" />
            Tocar
          </button>
        </>
      }
    >
      {showShare && (
        <ShareSheet name={setlist.name} songs={songs} file={setlistFile(setlist, songs)} onClose={() => setShowShare(false)} />
      )}

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <SetlistStats
        songCount={songs.length}
        totalDuration={setlist.totalDuration}
        venue={setlist.venue}
        date={setlist.date}
      />

      <div className="mt-6 mb-3 flex items-center justify-between">
        <SectionTitle>Canciones ({songs.length})</SectionTitle>
        <button type="button" onClick={() => setShowAddSong(true)} className={buttonClass('secondary', 'h-9 px-3')}>
          <Plus className="w-4 h-4" />
          Añadir
        </button>
      </div>

      {songs.length === 0 ? (
        <EmptyState
          icon={<ListMusic className="w-8 h-8" />}
          title="Este setlist está vacío"
          description="Añade canciones de tu repertorio y arrástralas para ordenarlas."
          action={
            <button type="button" onClick={() => setShowAddSong(true)} className={buttonClass('primary')}>
              <Plus className="w-4 h-4" />
              Añadir canción
            </button>
          }
        />
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
            <div className="space-y-2 max-sm:pb-16">
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

      {/* Phone: «Tocar» as a full-width bar above the navigation */}
      {songs.length > 0 && (
        <div className="sm:hidden fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-20 px-4 pb-2">
          <button type="button" onClick={handlePlayMode} className={buttonClass('primary', 'w-full h-12 shadow-lg shadow-primary/30')}>
            <Play className="w-4 h-4 fill-current" />
            Tocar el setlist
          </button>
        </div>
      )}

      {showAddSong && (
        <SongForm
          excludeSongIds={setlist.songIds}
          onSubmit={handleAddSong}
          onCancel={() => setShowAddSong(false)}
        />
      )}

      {showEditForm && (
        <SetlistForm
          setlist={setlist}
          onSubmit={handleEditSetlist}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {showDeleteConfirm && (
        <Dialog title="Eliminar setlist" onClose={() => setShowDeleteConfirm(false)}>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            ¿Seguro que quieres eliminar «{setlist.name}»? Las canciones siguen en tu repertorio, pero esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowDeleteConfirm(false)} className={buttonClass('secondary', 'flex-1')}>
              Cancelar
            </button>
            <button type="button" onClick={handleDeleteSetlist} className={buttonClass('danger', 'flex-1')}>
              Eliminar
            </button>
          </div>
        </Dialog>
      )}
    </Page>
  )
}
