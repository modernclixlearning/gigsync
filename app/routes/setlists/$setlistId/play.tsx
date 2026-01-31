import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '~/lib/utils'
import { useSetlist } from '~/hooks/useSetlist'

export const Route = createFileRoute('/setlists/$setlistId/play')({
  component: SetlistPlayPage,
})

function SetlistPlayPage() {
  const { setlistId } = Route.useParams()
  const navigate = useNavigate()
  const { setlist, songs, isLoading } = useSetlist(setlistId)
  const [currentIndex, setCurrentIndex] = useState(0)

  const currentSong = songs[currentIndex]
  const nextSong = songs[currentIndex + 1]

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }, [currentIndex])

  const handleNext = useCallback(() => {
    if (currentIndex < songs.length - 1) setCurrentIndex(currentIndex + 1)
  }, [currentIndex, songs.length])

  const handleExit = useCallback(() => {
    navigate({ to: '/setlists/$setlistId', params: { setlistId } })
  }, [navigate, setlistId])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        handleNext()
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevious()
      }
      if (e.key === 'Escape') {
        handleExit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrevious, handleExit])

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
      {/* Exit Button */}
      <button
        onClick={handleExit}
        className="fixed top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <span className="material-symbols-outlined">close</span>
      </button>

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/10">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / songs.length) * 100}%` }}
        />
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSong.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen flex flex-col items-center justify-center px-8"
        >
          {/* Song Info */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold mb-2">
              {currentSong.title}
            </h1>
            <p className="text-xl text-slate-400">{currentSong.artist}</p>
          </div>

          {/* Song Details */}
          <div className="flex gap-8 text-lg">
            <div className="flex items-center gap-2">
              <span className="text-primary">{currentSong.bpm}</span>
              <span className="text-slate-500">BPM</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary">{currentSong.key}</span>
              <span className="text-slate-500">Key</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary">{currentSong.timeSignature}</span>
              <span className="text-slate-500">Time</span>
            </div>
          </div>

          {/* Notes */}
          {currentSong.notes && (
            <div className="mt-8 max-w-md text-center">
              <p className="text-slate-400 italic">{currentSong.notes}</p>
            </div>
          )}

          {/* Counter */}
          <div className="mt-8 text-slate-500">
            {currentIndex + 1} / {songs.length}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center gap-4">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className={cn(
            'p-4 rounded-full transition-colors',
            currentIndex === 0 
              ? 'bg-white/5 text-white/30 cursor-not-allowed' 
              : 'bg-white/10 hover:bg-white/20'
          )}
        >
          <span className="material-symbols-outlined text-3xl">chevron_left</span>
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === songs.length - 1}
          className={cn(
            'p-4 rounded-full transition-colors',
            currentIndex === songs.length - 1 
              ? 'bg-white/5 text-white/30 cursor-not-allowed' 
              : 'bg-primary hover:bg-primary/80'
          )}
        >
          <span className="material-symbols-outlined text-3xl">chevron_right</span>
        </button>
      </div>

      {/* Next Song Preview */}
      {nextSong && (
        <div className="fixed bottom-24 left-0 right-0 text-center">
          <p className="text-sm text-slate-500">
            Next: <span className="text-slate-400">{nextSong.title}</span>
          </p>
        </div>
      )}

      {/* Keyboard Hint */}
      <div className="fixed bottom-4 left-4 text-xs text-slate-600">
        <span>← → to navigate • ESC to exit</span>
      </div>
    </div>
  )
}
