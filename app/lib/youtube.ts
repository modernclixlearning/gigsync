// YouTube link helpers for the play-along mini-player (issue #38).
// Pure functions only — no network, no YouTube Data API, no keys.

export interface ParsedYouTubeLink {
  /** 11-char YouTube video id. */
  videoId: string
  /** Start time encoded in the link (`t=` / `start=`), in whole seconds. */
  startSeconds?: number
}

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])

const SHORT_HOSTS = new Set(['youtu.be', 'www.youtu.be'])

/** Path prefixes that carry the video id as the next segment. */
const ID_PATH_PREFIXES = ['shorts', 'embed', 'live', 'v', 'e']

/**
 * Parses a YouTube time value: `90`, `90s`, `1m30s`, `1h2m3s`, `01:30`.
 * Returns whole seconds, or undefined when the value isn't a valid time.
 */
export function parseYouTubeTime(value: string | null | undefined): number | undefined {
  if (value == null) return undefined
  const raw = value.trim().toLowerCase()
  if (raw === '') return undefined

  if (/^\d+(\.\d+)?$/.test(raw)) return Math.floor(Number(raw))

  if (/^\d+(:\d{1,2}){1,2}$/.test(raw)) {
    return raw.split(':').reduce((acc, part) => acc * 60 + Number(part), 0)
  }

  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw)
  if (!match || (!match[1] && !match[2] && !match[3])) return undefined
  const [, h, m, s] = match
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0)
}

/**
 * Extracts the video id (and optional start time) from a pasted YouTube link.
 * Accepts watch?v=, youtu.be/, shorts/, embed/, live/ links, with or without
 * scheme, plus `t=` / `start=` (query or hash). Returns null for anything else.
 */
export function parseYouTubeUrl(input: string | null | undefined): ParsedYouTubeLink | null {
  if (!input) return null
  let text = input.trim()
  if (text === '' || /\s/.test(text)) return null
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `https://${text}`

  let url: URL
  try {
    url = new URL(text)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

  const host = url.hostname.toLowerCase()
  const segments = url.pathname.split('/').filter(Boolean)
  let videoId: string | undefined

  if (SHORT_HOSTS.has(host)) {
    videoId = segments[0]
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (segments[0] === 'watch') {
      videoId = url.searchParams.get('v') ?? undefined
    } else if (segments.length >= 2 && ID_PATH_PREFIXES.includes(segments[0])) {
      videoId = segments[1]
    }
  } else {
    return null
  }

  if (!videoId || !VIDEO_ID_RE.test(videoId)) return null

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
  const startSeconds =
    parseYouTubeTime(url.searchParams.get('t')) ??
    parseYouTubeTime(url.searchParams.get('start')) ??
    parseYouTubeTime(hashParams.get('t'))

  return startSeconds !== undefined && startSeconds > 0
    ? { videoId, startSeconds }
    : { videoId }
}

/** Canonical link stored on the song: https://www.youtube.com/watch?v=<id>. */
export function canonicalYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

/** YouTube search results page for "<artist> <title>" (opened in a new tab). */
export function buildYouTubeSearchUrl(artist: string, title: string): string {
  const query = [artist, title].map((s) => s.trim()).filter(Boolean).join(' ')
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}

/** Clamps/sanitizes a start offset to whole, non-negative seconds. */
export function normalizeStartSeconds(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

/** 75 → "1:15". */
export function formatSeconds(total: number): string {
  const s = normalizeStartSeconds(total)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}
