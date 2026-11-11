import { useState } from 'react'
import { FileDown, Music4, X } from 'lucide-react'
import { cn } from '~/lib/utils'
import { gigsyncToFile, midiToFile, shareOrDownload, type GigsyncFile } from '~/lib/gigsyncFile'
import { DEFAULT_SONG_MIDI_OPTIONS, songHasDrumPattern, songHasMidiContent, songsToMidi, type SongMidiOptions } from '~/lib/midi/songMidi'
import type { Song } from '~/types/setlist'
import { ShareToast } from './useGigsyncImport'

interface ShareSheetProps {
  /** Name of what is shared (file name and title): the song, the setlist, «Selección». */
  name: string
  /** The songs in it, in order. */
  songs: Song[]
  /** The .gigsync content. */
  file: GigsyncFile
  onClose: () => void
}

const MIDI_LABELS: { key: keyof SongMidiOptions; label: string }[] = [
  { key: 'chords', label: 'Acordes' },
  { key: 'bass', label: 'Bajo' },
  { key: 'drums', label: 'Batería' },
  { key: 'melody', label: 'Teclado grabado' },
  { key: 'click', label: 'Click' },
]

const buttonClass = cn(
  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left',
  'bg-slate-100 dark:bg-[#232948] hover:bg-slate-200 dark:hover:bg-[#2a3158] transition-colors disabled:opacity-40',
)

/**
 * What to do with a song, a setlist or a hand-picked list: send it as a .gigsync
 * (to another device) or as a .mid (chords, bass and the keyboard take, for the DAW).
 */
export function ShareSheet({ name, songs, file, onClose }: ShareSheetProps) {
  const [midi, setMidi] = useState<SongMidiOptions>(DEFAULT_SONG_MIDI_OPTIONS)
  const [message, setMessage] = useState<string | null>(null)
  const withMidi = songs.filter(songHasMidiContent)
  const hasTake = songs.some((song) => !!song.midiTake?.notes.length)
  const hasDrums = songs.some(songHasDrumPattern)
  const nothingToSend = !midi.chords && !midi.bass && !(midi.drums && hasDrums) && !(midi.melody && hasTake) && !midi.click

  const done = (result: 'shared' | 'downloaded' | 'cancelled') => {
    if (result === 'cancelled') return
    setMessage(result === 'shared' ? 'Enviado.' : 'Archivo descargado.')
    setTimeout(onClose, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-label={`Compartir ${name}`}>
      <div className="w-full sm:max-w-md bg-white dark:bg-[#1a1f36] rounded-t-2xl sm:rounded-2xl p-4 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 dark:text-white truncate">Compartir «{name}»</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {songs.length} {songs.length === 1 ? 'canción' : 'canciones'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <button type="button" className={buttonClass} onClick={async () => done(await shareOrDownload(gigsyncToFile(file, name)))}>
          <FileDown className="w-5 h-5 text-indigo-500 shrink-0" />
          <span>
            <span className="block font-medium text-slate-900 dark:text-white">Pasar a otro dispositivo (.gigsync)</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">En el otro dispositivo: botón Importar de GigSync</span>
          </span>
        </button>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-900 dark:text-white">Exportar a MIDI (.mid) para Ableton</p>
          <div className="flex flex-wrap gap-2">
            {MIDI_LABELS.map(({ key, label }) => {
              const disabled = (key === 'melody' && !hasTake) || (key === 'drums' && !hasDrums)
              return (
                <label
                  key={key}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer',
                    'bg-slate-100 dark:bg-[#232948] text-slate-700 dark:text-slate-200',
                    disabled && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={midi[key] && !disabled}
                    disabled={disabled}
                    onChange={(e) => setMidi({ ...midi, [key]: e.target.checked })}
                  />
                  {label}
                </label>
              )
            })}
          </div>
          <button
            type="button"
            className={buttonClass}
            disabled={withMidi.length === 0 || nothingToSend}
            onClick={async () => done(await shareOrDownload(midiToFile(songsToMidi(withMidi, midi), name)))}
          >
            <Music4 className="w-5 h-5 text-indigo-500 shrink-0" />
            <span>
              <span className="block font-medium text-slate-900 dark:text-white">Descargar .mid</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {withMidi.length === 0
                  ? 'Ninguna canción tiene acordes todavía'
                  : 'Cada canción con su tempo, compás y un marcador; una tras otra'}
              </span>
            </span>
          </button>
        </div>
      </div>
      {message && <ShareToast message={message} />}
    </div>
  )
}
