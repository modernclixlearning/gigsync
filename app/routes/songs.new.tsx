import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '~/lib/utils'
import { createSongSchema } from '~/lib/schemas'
import { useSongLibrary } from '~/hooks/useSongs'
import { SongForm } from '~/components/songs/SongForm'
import { ChordProImporter } from '~/components/songs/ChordProImporter'
import { SongSearchPanel } from '~/components/songs/SongSearchPanel'
import { ChordSheetPaste } from '~/components/songs/ChordSheetPaste'
import type { LyricsSearchResult } from '~/lib/lyrics/lrclib'
import { ROUTES, routeHelpers } from '~/lib/routes'
import type { CreateSongInput, ChordProSong } from '~/types'

export const Route = createFileRoute('/songs/new')({
  component: NewSongPage
})

function NewSongPage() {
  const navigate = useNavigate()
  const { createSong } = useSongLibrary()
  
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

  const handleSubmit = async () => {
    try {
      const validated = createSongSchema.parse(formData)
      const newId = await createSong(validated)
      navigate(routeHelpers.song(newId))
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as import('zod').ZodError
        alert(zodError.issues[0].message)
        return
      }
      console.error('Failed to create song:', error)
    }
  }

  /** Ask before overwriting lyrics the user already typed or imported. */
  const confirmReplaceLyrics = (next: string) =>
    !formData.lyrics?.trim() ||
    formData.lyrics === next ||
    window.confirm('¿Reemplazar la letra actual del formulario?')

  const handleSelectSearchResult = (result: LyricsSearchResult) => {
    const replaceLyrics = !!result.lyrics && confirmReplaceLyrics(result.lyrics)
    setFormData((prev) => ({
      ...prev,
      title: result.title || prev.title,
      artist: result.artist || prev.artist,
      duration: result.duration || prev.duration,
      lyrics: replaceLyrics ? result.lyrics : prev.lyrics
    }))
  }

  const handleApplyChordSheet = (chordPro: string) => {
    if (!confirmReplaceLyrics(chordPro)) return
    setFormData((prev) => ({ ...prev, lyrics: chordPro }))
  }

  const handleImport = (chordProSong: ChordProSong) => {
    const reconstructLine = (line: { text: string; chords: { chord: string; position: number }[] }) => {
      if (line.chords.length === 0) return line.text
      
      let result = ''
      let lastPos = 0
      
      const sortedChords = [...line.chords].sort((a, b) => a.position - b.position)
      
      for (const { chord, position } of sortedChords) {
        result += line.text.slice(lastPos, position)
        result += `[${chord}]`
        lastPos = position
      }
      
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#101322]">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-slate-50/80 dark:bg-[#101322]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => navigate({ to: ROUTES.HOME })}
            className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            aria-label="Back to library"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Add Song
          </h1>

          <div className="w-10" /> {/* Spacer for alignment */}
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

            {/* LRCLIB search + chord-sheet paste (#37) */}
            <div className="mb-4 space-y-3">
              <SongSearchPanel
                artist={formData.artist}
                title={formData.title}
                onSelect={handleSelectSearchResult}
              />
              <ChordSheetPaste onApply={handleApplyChordSheet} />
            </div>

            {/* Song Form */}
            <SongForm
              data={formData}
              onChange={setFormData}
              onSubmit={handleSubmit}
              submitLabel="Create Song"
            />
          </>
        )}
      </main>
    </div>
  )
}
