import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'
import { cn } from '~/lib/utils'
import { routeHelpers } from '~/lib/routes'
import { SongForm } from '~/components/songs/SongForm'
import type { CreateSongInput, Song, UpdateSongInput } from '~/types'

/** How long typing has to pause before the change is written (and the song re-renders). */
const LIVE_SAVE_DELAY_MS = 300

const toFormData = (song: Song): CreateSongInput => ({
  title: song.title,
  artist: song.artist,
  bpm: song.bpm,
  key: song.key,
  timeSignature: song.timeSignature,
  duration: song.duration,
  lyrics: song.lyrics,
  tags: song.tags,
  notes: song.notes ?? '',
  youtubeUrl: song.youtubeUrl,
  youtubeStartSeconds: song.youtubeStartSeconds,
})

const FIELDS: (keyof CreateSongInput)[] = [
  'title', 'artist', 'bpm', 'key', 'timeSignature', 'duration',
  'lyrics', 'tags', 'notes', 'youtubeUrl', 'youtubeStartSeconds',
]

/** Only the fields that differ from the stored song; title/artist are never blanked. */
function diffFromSong(song: Song, draft: CreateSongInput): UpdateSongInput {
  const stored = toFormData(song)
  const changes: Record<string, unknown> = {}
  for (const field of FIELDS) {
    const next = draft[field]
    const prev = stored[field]
    const same = Array.isArray(next) && Array.isArray(prev)
      ? next.join('\u0000') === prev.join('\u0000')
      : next === prev
    if (same) continue
    if ((field === 'title' || field === 'artist') && !String(next ?? '').trim()) continue
    // Half-typed BPM ("9" on the way to "95") would retime the song for a moment.
    if (field === 'bpm' && (typeof next !== 'number' || next < 20 || next > 300)) continue
    changes[field] = next
  }
  return changes as UpdateSongInput
}

interface SongLiveEditorProps {
  song: Song
  onSave: (changes: UpdateSongInput) => Promise<void>
  isChordEditMode: boolean
  /** Undefined when chord editing isn't available right now (playing, or chords hidden). */
  onToggleChordEditMode?: () => void
}

/**
 * The song edit form, inside the player's side panel: every change is
 * written after a short pause, so the song next to it re-renders with the
 * new lyrics/chords/BPM while you type — no Save button, no page switch.
 */
export function SongLiveEditor({ song, onSave, isChordEditMode, onToggleChordEditMode }: SongLiveEditorProps) {
  const [draft, setDraft] = useState<CreateSongInput>(() => toFormData(song))
  /** The ChordPro text starts read-only; "Editar" unlocks it. */
  const [isLyricsLocked, setIsLyricsLocked] = useState(true)
  const songRef = useRef(song)
  songRef.current = song
  const pendingRef = useRef<CreateSongInput | null>(null)
  const inFlightRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const pending = pendingRef.current
    pendingRef.current = null
    if (!pending) return
    const changes = diffFromSong(songRef.current, pending)
    if (Object.keys(changes).length === 0) return
    inFlightRef.current += 1
    void onSave(changes).finally(() => {
      inFlightRef.current -= 1
    })
  }, [onSave])

  // Follow changes made elsewhere (chord drag on the sheet, YouTube offset,
  // switching songs in a setlist) — but never while our own write is pending
  // or in flight, or the refetch would roll back what's being typed.
  useEffect(() => {
    if (pendingRef.current || inFlightRef.current > 0) return
    setDraft(toFormData(song))
  }, [song])

  // Write whatever is still pending when the panel closes (the parent keys
  // this component by song id, so switching songs unmounts it too).
  useEffect(() => flush, [flush])

  const handleChange = (next: CreateSongInput) => {
    setDraft(next)
    pendingRef.current = next
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flush, LIVE_SAVE_DELAY_MS)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 px-3 py-2">
        <div className="text-sm">
          <p className="font-medium">Acordes sobre la letra</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {onToggleChordEditMode
              ? 'Arrastrá y editá los acordes directamente en la canción.'
              : 'Pausá la reproducción (con acordes visibles) para editarlos.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleChordEditMode}
          disabled={!onToggleChordEditMode}
          aria-pressed={isChordEditMode}
          className={cn(
            'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40',
            isChordEditMode
              ? 'bg-indigo-500 text-white'
              : 'bg-white dark:bg-[#232948] text-slate-600 dark:text-slate-300'
          )}
        >
          <Pencil className="w-4 h-4" />
          {isChordEditMode ? 'Editando' : 'Editar'}
        </button>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Los cambios se guardan solos y se ven al instante en la canción.
      </p>

      <SongForm
        data={draft}
        onChange={handleChange}
        lyricsLock={{ locked: isLyricsLocked, onToggle: () => setIsLyricsLocked((locked) => !locked) }}
      />

      <Link
        {...routeHelpers.songEdit(song.id)}
        className="block text-center text-sm text-indigo-500 hover:text-indigo-600 py-2"
      >
        Importar ChordPro, detectar desde audio o borrar →
      </Link>
    </div>
  )
}
