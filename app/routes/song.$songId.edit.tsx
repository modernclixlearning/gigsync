import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useSong, useSongLibrary } from '~/hooks/useSongs'
import { SongForm } from '~/components/songs/SongForm'
import { ChordProImporter } from '~/components/songs/ChordProImporter'
import { ROUTES, routeHelpers } from '~/lib/routes'
import type { CreateSongInput, UpdateSongInput, ChordProSong } from '~/types'

export const Route = createFileRoute('/song/$songId/edit')({
  component: SongEditPage
})

function SongEditPage() {
  const { songId } = Route.useParams()
  const navigate = useNavigate()
  const isNewSong = songId === 'new'
  
  const { song, isLoading, updateSong } = useSong(isNewSong ? '' : songId)
  const { createSong, deleteSong } = useSongLibrary()
  
  const [showImporter, setShowImporter] = useState(false)
  const [formData, setFormData] = useState<CreateSongInput>({
    title: '',
    artist: '',
    bpm: 120,
    key: 'C',
    timeSignature: '4/4',
    duration: 0,
    lyrics: '',
    tags: [],
    notes: ''
  })

  // Load existing song data
  useEffect(() => {
    if (song && !isNewSong) {
      setFormData({
        title: song.title,
        artist: song.artist,
        bpm: song.bpm,
        key: song.key,
        timeSignature: song.timeSignature,
        duration: song.duration,
        lyrics: song.lyrics,
        tags: song.tags,
        notes: song.notes ?? ''
      })
    }
  }, [song, isNewSong])

  const handleSubmit = async () => {
    try {
      if (isNewSong) {
        const newId = await createSong(formData)
        navigate(routeHelpers.song(newId))
      } else {
        await updateSong(formData as UpdateSongInput)
        navigate(routeHelpers.song(songId))
      }
    } catch (error) {
      console.error('Failed to save song:', error)
    }
  }

  const handleDelete = async () => {
    if (!isNewSong && confirm('Are you sure you want to delete this song?')) {
      try {
        await deleteSong(songId)
        navigate({ to: ROUTES.HOME })
      } catch (error) {
        console.error('Failed to delete song:', error)
      }
    }
  }

  const handleImport = (chordProSong: ChordProSong) => {
    // Reconstruct lines with chords in ChordPro format [Chord]
    const reconstructLine = (line: { text: string; chords: { chord: string; position: number }[] }) => {
      if (line.chords.length === 0) return line.text
      
      let result = ''
      let lastPos = 0
      
      // Sort chords by position
      const sortedChords = [...line.chords].sort((a, b) => a.position - b.position)
      
      for (const { chord, position } of sortedChords) {
        // Add text before this chord position
        result += line.text.slice(lastPos, position)
        // Add the chord in brackets
        result += `[${chord}]`
        lastPos = position
      }
      
      // Add remaining text
      result += line.text.slice(lastPos)
      
      return result
    }
    
    setFormData((prev) => ({
      ...prev,
      title: chordProSong.title || prev.title,
      artist: chordProSong.artist || prev.artist,
      key: chordProSong.key || prev.key,
      bpm: chordProSong.tempo || prev.bpm,
      timeSignature: chordProSong.timeSignature || prev.timeSignature,
      lyrics: chordProSong.lines.map(reconstructLine).join('\n')
    }))
    setShowImporter(false)
  }

  if (isLoading && !isNewSong) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#101322] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#101322]">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-slate-50/80 dark:bg-[#101322]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => navigate(isNewSong ? { to: ROUTES.HOME } : routeHelpers.song(songId))}
            className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            {isNewSong ? 'Add Song' : 'Edit Song'}
          </h1>

          <div className="flex items-center gap-2">
            {!isNewSong && (
              <button
                onClick={handleDelete}
                className="p-2 text-red-500 hover:text-red-600"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-24">
        {showImporter ? (
          <ChordProImporter
            onImport={handleImport}
            onCancel={() => setShowImporter(false)}
          />
        ) : (
          <>
            {/* Import Button */}
            <button
              onClick={() => setShowImporter(true)}
              className={cn(
                'w-full mb-4 px-4 py-3 rounded-xl',
                'bg-slate-100 dark:bg-slate-800',
                'text-slate-600 dark:text-slate-400',
                'hover:bg-slate-200 dark:hover:bg-slate-700',
                'transition-colors text-sm font-medium'
              )}
            >
              Import from ChordPro
            </button>

            {/* Song Form */}
            <SongForm
              data={formData}
              onChange={setFormData}
              onSubmit={handleSubmit}
              submitLabel={isNewSong ? 'Create Song' : 'Save Changes'}
            />
          </>
        )}
      </main>
    </div>
  )
}
