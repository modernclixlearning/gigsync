import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Loader2, WifiOff, AlertCircle, Music, ExternalLink } from 'lucide-react'
import { cn } from '~/lib/utils'
import { searchLyrics, LyricsSearchError, type LyricsSearchResult } from '~/lib/lyrics/lrclib'
import { CHORD_SITES, buildChordSearchQuery } from '~/lib/lyrics/chordSites'

interface SongSearchPanelProps {
  /** Current form artist/title — used to seed the query and the chord links. */
  artist: string
  title: string
  /** Called when the user picks a result. Nothing is saved here. */
  onSelect: (result: LyricsSearchResult) => void
}

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; results: LyricsSearchResult[] }
  | { status: 'error'; kind: LyricsSearchError['kind'] | 'unknown' }

const ERROR_MESSAGES: Record<LyricsSearchError['kind'] | 'unknown', string> = {
  offline: 'Sin conexión. La búsqueda necesita internet; podés cargar la canción a mano igual.',
  network: 'No se pudo conectar con LRCLIB. Revisá la conexión y probá de nuevo.',
  http: 'LRCLIB respondió con un error. Probá de nuevo en un rato.',
  invalid: 'LRCLIB devolvió una respuesta inesperada. Probá de nuevo en un rato.',
  unknown: 'Algo salió mal al buscar. Probá de nuevo.',
}

function formatDuration(seconds: number): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const inputClass = cn(
  'w-full px-4 py-3 rounded-xl',
  'bg-white dark:bg-[#1a1f36]',
  'border border-slate-200 dark:border-slate-700',
  'text-slate-900 dark:text-white',
  'placeholder:text-slate-400',
  'focus:outline-none focus:ring-2 focus:ring-indigo-500'
)

const secondaryButtonClass = cn(
  'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg',
  'bg-white dark:bg-[#1a1f36]',
  'border border-slate-200 dark:border-slate-700',
  'text-slate-700 dark:text-slate-300',
  'hover:bg-slate-50 dark:hover:bg-slate-700',
  'transition-colors text-sm font-medium'
)

export function SongSearchPanel({ artist, title, onSelect }: SongSearchPanelProps) {
  const [query, setQuery] = useState(() => buildChordSearchQuery(artist, title))
  const [state, setState] = useState<SearchState>({ status: 'idle' })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const handleSearch = useCallback(async () => {
    const q = query.trim()
    if (!q) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState({ status: 'loading' })
    setSelectedId(null)
    try {
      const results = await searchLyrics(q, { signal: controller.signal })
      if (controller.signal.aborted) return
      setState({ status: 'done', results })
    } catch (error) {
      if (controller.signal.aborted) return
      setState({
        status: 'error',
        kind: error instanceof LyricsSearchError ? error.kind : 'unknown',
      })
    }
  }, [query])

  const handleSelect = (result: LyricsSearchResult) => {
    setSelectedId(result.id)
    onSelect(result)
  }

  // Chord links use the form's artist/title once known, else the free query.
  const chordQuery = buildChordSearchQuery(artist, title) || query.trim()

  return (
    <section className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Buscar canción
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Buscá la letra en LRCLIB por artista y título. Al elegir un resultado se rellena el
          formulario; no se guarda nada hasta que confirmes.
        </p>
      </div>

      <form
        role="search"
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void handleSearch()
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Artista y título, ej. Soda Stereo De música ligera"
          aria-label="Buscar por artista y título"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={!query.trim() || state.status === 'loading'}
          className={cn(
            'shrink-0 inline-flex items-center gap-2 px-4 rounded-xl font-medium',
            'bg-indigo-500 text-white hover:bg-indigo-600',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors'
          )}
        >
          {state.status === 'loading' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Buscar
        </button>
      </form>

      {/* States */}
      <div aria-live="polite">
        {state.status === 'loading' && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Buscando en LRCLIB…</p>
        )}

        {state.status === 'error' && (
          <p
            role="alert"
            className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
          >
            {state.kind === 'offline' ? (
              <WifiOff className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            {ERROR_MESSAGES[state.kind]}
          </p>
        )}

        {state.status === 'done' && state.results.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sin resultados para esa búsqueda. Probá con otras palabras o cargala a mano.
          </p>
        )}

        {state.status === 'done' && state.results.length > 0 && (
          <ul className="max-h-72 overflow-y-auto space-y-1.5" aria-label="Resultados de LRCLIB">
            {state.results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(r)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg border transition-colors',
                    'bg-white dark:bg-[#1a1f36]',
                    selectedId === r.id
                      ? 'border-indigo-500 ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900 dark:text-white truncate">
                      {r.title}
                    </span>
                    <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                      {formatDuration(r.duration)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {r.artist || 'Artista desconocido'}
                    {r.album && ` · ${r.album}`}
                    {!r.lyrics && (r.instrumental ? ' · Instrumental' : ' · Sin letra')}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* External chord searches (new tab, no scraping) */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Buscar acordes en:
        </p>
        <div className="flex flex-wrap gap-2">
          {CHORD_SITES.map((site) =>
            chordQuery ? (
              <a
                key={site.id}
                href={site.buildUrl(chordQuery)}
                target="_blank"
                rel="noopener noreferrer"
                className={secondaryButtonClass}
              >
                {site.name}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span
                key={site.id}
                aria-disabled="true"
                title="Escribí artista o título primero"
                className={cn(secondaryButtonClass, 'opacity-50 cursor-not-allowed')}
              >
                {site.name}
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
            )
          )}
        </div>
        <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <Music className="w-3.5 h-3.5" />
          Copiá el cifrado de la página y pegalo abajo en «Pegar cifrado».
        </p>
      </div>
    </section>
  )
}
