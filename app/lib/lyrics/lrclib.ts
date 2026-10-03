/**
 * LRCLIB client — public lyrics database (https://lrclib.net).
 *
 * Called straight from the browser: no API key, no backend, CORS enabled
 * (`access-control-allow-origin: *`). This is the only network call GigSync
 * makes; everything else stays offline-first.
 *
 * API: GET https://lrclib.net/api/search?q=<free text>
 * Response: array of records
 *   { id, name, trackName, artistName, albumName, duration (seconds, float),
 *     instrumental, plainLyrics: string | null, syncedLyrics: string | null }
 */

export const LRCLIB_SEARCH_URL = 'https://lrclib.net/api/search'

/** Normalised search result used by the UI. */
export interface LyricsSearchResult {
  id: number
  title: string
  artist: string
  album: string
  /** Duration in whole seconds (0 if unknown). */
  duration: number
  instrumental: boolean
  /** Plain (unsynced) lyrics; empty string if none. */
  lyrics: string
}

export type LyricsSearchErrorKind = 'offline' | 'network' | 'http' | 'invalid'

export class LyricsSearchError extends Error {
  readonly kind: LyricsSearchErrorKind

  constructor(kind: LyricsSearchErrorKind, message: string) {
    super(message)
    this.name = 'LyricsSearchError'
    this.kind = kind
  }
}

interface LrclibRecord {
  id?: unknown
  trackName?: unknown
  name?: unknown
  artistName?: unknown
  albumName?: unknown
  duration?: unknown
  instrumental?: unknown
  plainLyrics?: unknown
  syncedLyrics?: unknown
}

const asString = (v: unknown): string => (typeof v === 'string' ? v : '')

/** Strip `[mm:ss.xx]` timestamps from synced lyrics (fallback when no plain lyrics). */
export function stripLrcTimestamps(synced: string): string {
  return synced
    .split('\n')
    .map((line) => line.replace(/^(\s*\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\])+\s?/, ''))
    .join('\n')
    .trim()
}

/** Map a raw LRCLIB record to a `LyricsSearchResult` (null if unusable). */
export function normalizeLrclibRecord(raw: unknown): LyricsSearchResult | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as LrclibRecord
  if (typeof r.id !== 'number') return null

  const title = asString(r.trackName) || asString(r.name)
  if (!title) return null

  const plain = asString(r.plainLyrics).trim()
  const synced = asString(r.syncedLyrics)
  const lyrics = plain || (synced ? stripLrcTimestamps(synced) : '')

  return {
    id: r.id,
    title,
    artist: asString(r.artistName),
    album: asString(r.albumName),
    duration: typeof r.duration === 'number' && r.duration > 0 ? Math.round(r.duration) : 0,
    instrumental: r.instrumental === true,
    lyrics: lyrics.replace(/\r/g, ''),
  }
}

export interface SearchLyricsOptions {
  signal?: AbortSignal
  fetchImpl?: typeof fetch
  /** Override `navigator.onLine` detection (tests). */
  isOnline?: () => boolean
}

const defaultIsOnline = () =>
  typeof navigator === 'undefined' || navigator.onLine !== false

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

/**
 * Search LRCLIB by free text (artist and/or title).
 * Throws `LyricsSearchError` on offline / network / HTTP / malformed response.
 * Abort errors (from `signal`) are rethrown untouched.
 */
export async function searchLyrics(
  query: string,
  { signal, fetchImpl, isOnline = defaultIsOnline }: SearchLyricsOptions = {}
): Promise<LyricsSearchResult[]> {
  const q = query.trim()
  if (!q) return []

  if (!isOnline()) {
    throw new LyricsSearchError('offline', 'Sin conexión')
  }

  const doFetch = fetchImpl ?? fetch
  let response: Response
  try {
    response = await doFetch(`${LRCLIB_SEARCH_URL}?q=${encodeURIComponent(q)}`, {
      signal,
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new LyricsSearchError(isOnline() ? 'network' : 'offline', 'Error de red')
  }

  if (!response.ok) {
    throw new LyricsSearchError('http', `HTTP ${response.status}`)
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new LyricsSearchError('invalid', 'Respuesta no válida')
  }
  if (!Array.isArray(data)) {
    throw new LyricsSearchError('invalid', 'Respuesta no válida')
  }

  return data
    .map(normalizeLrclibRecord)
    .filter((r): r is LyricsSearchResult => r !== null)
}
