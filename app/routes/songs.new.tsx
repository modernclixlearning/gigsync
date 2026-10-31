import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useDiscardUntouchedNewSongs, useSongLibrary } from '~/hooks/useSongs'
import { blankSongInput } from '~/lib/newSong'

export const Route = createFileRoute('/songs/new')({
  component: NewSongPage
})

/**
 * "Add song": creates a blank song and opens it in the player with the
 * Editar panel — search the lyrics, paste a chord sheet, import, record from
 * a MIDI keyboard or type, and watch it take shape next to the panel. Saved as
 * you go; a blank song left untouched is discarded later.
 */
function NewSongPage() {
  const navigate = useNavigate()
  const { createSong } = useSongLibrary()
  const discardUntouchedNewSongs = useDiscardUntouchedNewSongs()
  // Once per visit, even if React runs the effect twice.
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void (async () => {
      await discardUntouchedNewSongs()
      const songId = await createSong(blankSongInput())
      void navigate({ to: '/song/$songId', params: { songId }, search: { panel: 'edit' }, replace: true })
    })()
  }, [createSong, discardUntouchedNewSongs, navigate])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#101322] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
    </div>
  )
}
