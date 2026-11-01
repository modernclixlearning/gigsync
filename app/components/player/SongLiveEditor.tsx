import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioLines, FileUp, Pencil, Piano, Search, Trash2 } from 'lucide-react'
import { cn } from '~/lib/utils'
import { SongForm } from '~/components/songs/SongForm'
import { ChordProImporter } from '~/components/songs/ChordProImporter'
import { AudioAnalysisPanel, type AudioAnalysisApply } from '~/components/songs/AudioAnalysisPanel'
import { MIDIRecordPanel } from '~/components/songs/MIDIRecordPanel'
import { SongSearchPanel } from '~/components/songs/SongSearchPanel'
import { ChordSheetPaste } from '~/components/songs/ChordSheetPaste'
import type { LyricsSearchResult } from '~/lib/lyrics/lrclib'
import { NEW_SONG_TITLE, isUntouchedNewSong } from '~/lib/newSong'
import { appendSection } from '~/lib/audioAnalysis/chordproOutput'
import { applyChordProImport } from '~/lib/chordpro/importToForm'
import type { ChordProSong, CreateSongInput, Song, UpdateSongInput } from '~/types'

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
  /** Deletes the song (after confirming); omitted where deleting doesn't apply (e.g. inside a setlist). */
  onDelete?: () => void | Promise<void>
  /** Snap step (in beats) when stretching or splitting chords on the sheet. */
  chordGrid?: { value: number; onChange: (value: number) => void }
}

const CHORD_GRID_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '1/4' },
  { value: 0.5, label: '1/8' },
  { value: 0.25, label: '1/16' },
]

type EditorTool = 'search' | 'import' | 'audio' | 'midi'

const toolButtonClass = cn(
  'w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
  'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  'hover:bg-slate-200 dark:hover:bg-slate-700'
)

/**
 * The song edit form, inside the player's side panel: every change is
 * written after a short pause, so the song next to it re-renders with the
 * new lyrics/chords/BPM while you type — no Save button, no page switch.
 * The tools (search the lyrics, paste a chord sheet, import ChordPro, detect
 * from audio, record from a MIDI keyboard) and deleting the song live here too
 * — also for a song just created by "Add song", which opens with the search.
 */
export function SongLiveEditor({
  song,
  onSave,
  isChordEditMode,
  onToggleChordEditMode,
  onDelete,
  chordGrid,
}: SongLiveEditorProps) {
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

  // A blank song from "Add song" starts at the lyrics search: usually the first step.
  const [tool, setTool] = useState<EditorTool | null>(() => (isUntouchedNewSong(song) ? 'search' : null))
  const toggleTool = (next: EditorTool) => setTool((current) => (current === next ? null : next))

  /** Ask before overwriting lyrics that are already there. */
  const confirmReplaceLyrics = (next: string) =>
    !draft.lyrics?.trim() || draft.lyrics === next || window.confirm('¿Reemplazar la letra actual?')

  const handleSelectSearchResult = (result: LyricsSearchResult) => {
    const replaceLyrics = !!result.lyrics && confirmReplaceLyrics(result.lyrics)
    handleChange({
      ...draft,
      title: result.title || draft.title,
      artist: result.artist || draft.artist,
      duration: result.duration || draft.duration,
      lyrics: replaceLyrics ? result.lyrics : draft.lyrics,
    })
    setTool(null)
  }

  const handleApplyChordSheet = (chordPro: string) => {
    if (confirmReplaceLyrics(chordPro)) handleChange({ ...draft, lyrics: chordPro })
  }

  // Saved right away like any other edit, so replacing the lyrics asks first.
  const handleImport = (imported: ChordProSong) => {
    if (draft.lyrics?.trim() && !window.confirm('¿Reemplazar la letra y los acordes por los del archivo importado?')) return
    handleChange(applyChordProImport(draft, imported))
    setTool(null)
  }

  // Detected or recorded chords are appended as their own section; the lyrics aren't rewritten.
  const handleApplyChords = ({ bpm, key, section }: AudioAnalysisApply) => {
    handleChange({
      ...draft,
      bpm: bpm ?? draft.bpm,
      key: key ?? draft.key,
      lyrics: section ? appendSection(draft.lyrics ?? '', section) : draft.lyrics,
    })
    setTool(null)
  }

  const handleDelete = () => {
    if (onDelete && window.confirm(`¿Borrar «${song.title}»? No se puede deshacer.`)) void onDelete()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
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
        {chordGrid && (
          <div role="group" aria-label="Grilla de los acordes" className="flex items-center gap-1 text-xs">
            <span className="mr-1 text-slate-500 dark:text-slate-400">Grilla al estirar o dividir</span>
            {CHORD_GRID_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={chordGrid.value === option.value}
                onClick={() => chordGrid.onChange(option.value)}
                className={cn(
                  'px-2 py-1 rounded-lg font-medium',
                  chordGrid.value === option.value
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white dark:bg-[#232948] text-slate-600 dark:text-slate-300'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {tool === 'search' ? (
          <div className="space-y-1">
            <SongSearchPanel
              artist={draft.artist}
              title={draft.title === NEW_SONG_TITLE ? '' : draft.title}
              onSelect={handleSelectSearchResult}
            />
            <button
              type="button"
              onClick={() => setTool(null)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Ocultar búsqueda
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => toggleTool('search')} className={toolButtonClass}>
            <Search className="w-4 h-4" />
            Buscar letra (LRCLIB)
          </button>
        )}
        <ChordSheetPaste onApply={handleApplyChordSheet} />
        {tool === 'import' ? (
          <ChordProImporter onImport={handleImport} onCancel={() => setTool(null)} />
        ) : (
          <button type="button" onClick={() => toggleTool('import')} className={toolButtonClass}>
            <FileUp className="w-4 h-4" />
            Importar ChordPro
          </button>
        )}
        {tool === 'audio' ? (
          <AudioAnalysisPanel
            timeSignature={draft.timeSignature ?? '4/4'}
            currentBpm={draft.bpm ?? 120}
            onApply={handleApplyChords}
            onClose={() => setTool(null)}
          />
        ) : (
          <button type="button" onClick={() => toggleTool('audio')} className={toolButtonClass}>
            <AudioLines className="w-4 h-4" />
            Detectar acordes y BPM desde audio
          </button>
        )}
        <button type="button" onClick={() => setTool('midi')} className={toolButtonClass}>
          <Piano className="w-4 h-4" />
          Grabar acordes desde teclado MIDI
        </button>
        {tool === 'midi' && (
          <MIDIRecordPanel
            timeSignature={draft.timeSignature ?? '4/4'}
            currentBpm={draft.bpm ?? 120}
            currentKey={draft.key}
            onApply={handleApplyChords}
            onClose={() => setTool(null)}
          />
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Los cambios se guardan solos y se ven al instante en la canción.
      </p>

      <SongForm
        data={draft}
        onChange={handleChange}
        lyricsLock={{ locked: isLyricsLocked, onToggle: () => setIsLyricsLocked((locked) => !locked) }}
      />

      {onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Borrar canción
        </button>
      )}
    </div>
  )
}
