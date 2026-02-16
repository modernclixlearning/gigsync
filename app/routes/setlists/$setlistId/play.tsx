import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSetlist } from '~/hooks/useSetlist'
import { SongPlayerContent } from '~/components/player/SongPlayerContent'
import { routeHelpers } from '~/lib/routes'

export const Route = createFileRoute('/setlists/$setlistId/play')({
  validateSearch: (search: Record<string, unknown>): { index?: number } => {
    const index = search?.index
    if (typeof index === 'string') {
      const parsed = parseInt(index, 10)
      if (!Number.isNaN(parsed) && parsed >= 0) return { index: parsed }
    }
    if (typeof index === 'number' && index >= 0) return { index }
    return {}
  },
  component: SetlistPlayPage
})

function SetlistPlayPage() {
  const { setlistId } = Route.useParams()
  const { index: searchIndex } = Route.useSearch()
  const navigate = useNavigate()
  const { setlist, songs, isLoading } = useSetlist(setlistId)

  const initialIndex =
    typeof searchIndex === 'number' && searchIndex < songs.length
      ? searchIndex
      : 0

  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  // Sync currentIndex when search param changes (e.g. direct navigation)
  useEffect(() => {
    if (typeof searchIndex === 'number' && searchIndex >= 0 && searchIndex < songs.length) {
      setCurrentIndex(searchIndex)
    }
  }, [searchIndex, songs.length])

  const currentSong = songs[currentIndex]
  const nextSong = songs[currentIndex + 1]

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }, [currentIndex])

  const handleNext = useCallback(() => {
    if (currentIndex < songs.length - 1) setCurrentIndex(currentIndex + 1)
  }, [currentIndex, songs.length])

  const handleExit = useCallback(() => {
    navigate(routeHelpers.setlist(setlistId))
  }, [navigate, setlistId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05060b] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!setlist || songs.length === 0) {
    return (
      <div className="min-h-screen bg-[#05060b] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl mb-4">No songs in this setlist</p>
          <button
            onClick={handleExit}
            className="px-4 py-2 bg-primary text-white rounded-xl"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#05060b] text-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSong.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          <SongPlayerContent
            song={currentSong}
            setlistContext={{
              setlistId,
              setlistName: setlist.name,
              currentIndex,
              totalSongs: songs.length,
              nextSong,
              onPrevious: handlePrevious,
              onNext: handleNext,
              onExit: handleExit
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Keyboard hint */}
      <div className="fixed bottom-4 left-4 text-xs text-slate-600 z-10">
        <span>← → to navigate • ESC to exit</span>
      </div>
    </div>
  )
}
