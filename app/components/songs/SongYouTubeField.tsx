import { useEffect, useState } from 'react'
import { cn } from '~/lib/utils'
import {
  buildYouTubeSearchUrl,
  canonicalYouTubeUrl,
  formatSeconds,
  normalizeStartSeconds,
  parseYouTubeUrl,
} from '~/lib/youtube'

export interface SongYouTubeValue {
  youtubeUrl?: string
  youtubeStartSeconds?: number
}

interface SongYouTubeFieldProps extends SongYouTubeValue {
  artist: string
  title: string
  onChange: (value: SongYouTubeValue) => void
  /** Reports whether the pasted link is usable (empty counts as valid). */
  onValidityChange?: (valid: boolean) => void
}

const inputClass = cn(
  'w-full px-4 py-3 rounded-xl',
  'bg-white dark:bg-[#1a1f36]',
  'border text-slate-900 dark:text-white',
  'placeholder:text-slate-400',
  'focus:outline-none focus:ring-2 focus:ring-indigo-500'
)

/**
 * Self-contained "Video de YouTube" section of the song form (issue #38):
 * a search shortcut (opens YouTube in a new tab — no Data API) plus a field
 * for the pasted link and the play-along start offset.
 */
export function SongYouTubeField({
  artist,
  title,
  youtubeUrl,
  youtubeStartSeconds,
  onChange,
  onValidityChange,
}: SongYouTubeFieldProps) {
  const [draft, setDraft] = useState(youtubeUrl ?? '')

  // Follow external changes (song loaded in the edit page) without
  // clobbering what the user typed when it already maps to the same video.
  useEffect(() => {
    const draftVideo = parseYouTubeUrl(draft)
    const draftCanonical = draftVideo ? canonicalYouTubeUrl(draftVideo.videoId) : ''
    if ((youtubeUrl ?? '') !== draftCanonical && !(draft.trim() !== '' && !draftVideo)) {
      setDraft(youtubeUrl ?? '')
    }
    // Only external value changes should resync the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeUrl])

  const trimmed = draft.trim()
  const parsed = parseYouTubeUrl(trimmed)
  const isInvalid = trimmed !== '' && !parsed

  useEffect(() => {
    onValidityChange?.(!isInvalid)
  }, [isInvalid, onValidityChange])

  const handleLinkChange = (value: string) => {
    setDraft(value)
    const text = value.trim()
    if (text === '') {
      onChange({ youtubeUrl: undefined, youtubeStartSeconds: undefined })
      return
    }
    const link = parseYouTubeUrl(text)
    if (!link) return
    onChange({
      youtubeUrl: canonicalYouTubeUrl(link.videoId),
      // A `t=` in the pasted link wins; otherwise keep the offset already set.
      youtubeStartSeconds: link.startSeconds ?? youtubeStartSeconds,
    })
  }

  const searchUrl = buildYouTubeSearchUrl(artist, title)
  const canSearch = artist.trim() !== '' || title.trim() !== ''
  const offset = normalizeStartSeconds(youtubeStartSeconds)

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label
          htmlFor="song-youtube-url"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Video de YouTube (opcional)
        </label>
        <a
          href={canSearch ? searchUrl : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!canSearch}
          title={canSearch ? 'Abre la búsqueda en una pestaña nueva' : 'Completá título o artista'}
          className={cn(
            'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            canSearch
              ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40'
              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 pointer-events-none'
          )}
        >
          <span className="material-symbols-outlined text-sm leading-none">search</span>
          Buscar en YouTube
        </a>
      </div>
      <input
        id="song-youtube-url"
        type="url"
        inputMode="url"
        value={draft}
        onChange={(e) => handleLinkChange(e.target.value)}
        placeholder="Pegá el link: youtube.com/watch?v=… o youtu.be/…"
        aria-invalid={isInvalid}
        aria-describedby="song-youtube-help"
        className={cn(
          inputClass,
          isInvalid ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
        )}
      />
      <p
        id="song-youtube-help"
        role={isInvalid ? 'alert' : undefined}
        className={cn(
          'mt-1 text-xs',
          isInvalid ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
        )}
      >
        {isInvalid
          ? 'Link no válido. Pegá un link de un video (watch?v=, youtu.be/, shorts/ o embed/).'
          : 'Se reproduce acoplado al Play del player para tocar encima de la versión original.'}
      </p>

      {parsed && (
        <div className="mt-3 flex items-center gap-3">
          <label
            htmlFor="song-youtube-start"
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Empezar en
          </label>
          <input
            id="song-youtube-start"
            type="number"
            min={0}
            step={1}
            value={offset}
            onChange={(e) =>
              onChange({ youtubeUrl, youtubeStartSeconds: normalizeStartSeconds(e.target.value) })
            }
            className={cn(inputClass, 'w-24 text-center border-slate-200 dark:border-slate-700')}
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            seg ({formatSeconds(offset)})
          </span>
        </div>
      )}
    </div>
  )
}
