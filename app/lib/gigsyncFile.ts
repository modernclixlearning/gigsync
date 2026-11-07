/**
 * The .gigsync file (pure): songs and setlists to pass between devices. It is
 * the same JSON as the full backup (songs + setlists), so the importer reads
 * both; `kind` only says what was exported.
 */

import type { Song, Setlist } from '~/types/setlist'

export const GIGSYNC_EXTENSION = '.gigsync'
export const GIGSYNC_MIME = 'application/json'

export type GigsyncKind = 'song' | 'setlist' | 'selection' | 'all'

export interface GigsyncFile {
  format: 'gigsync'
  version: 2
  kind: GigsyncKind
  exportedAt: string
  songs: Song[]
  setlists: Setlist[]
}

export function buildGigsyncFile(kind: GigsyncKind, songs: Song[], setlists: Setlist[] = [], now = new Date()): GigsyncFile {
  return { format: 'gigsync', version: 2, kind, exportedAt: now.toISOString(), songs, setlists }
}

/** One song. */
export const songFile = (song: Song): GigsyncFile => buildGigsyncFile('song', [song])

/** A setlist with the songs it contains (in the setlist's order, missing ones skipped). */
export function setlistFile(setlist: Setlist, allSongs: Song[]): GigsyncFile {
  const byId = new Map(allSongs.map((song) => [song.id, song]))
  const songs = setlist.songIds.flatMap((id) => byId.get(id) ?? [])
  return buildGigsyncFile('setlist', songs, [setlist])
}

/** A hand-picked list of songs. */
export function selectionFile(ids: Iterable<string>, allSongs: Song[]): GigsyncFile {
  const wanted = new Set(ids)
  return buildGigsyncFile('selection', allSongs.filter((song) => wanted.has(song.id)))
}

const reviveDate = (value: unknown): Date | undefined => {
  if (value == null) return undefined
  const date = new Date(value as string | number | Date)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function reviveSong(raw: Song): Song {
  return {
    ...raw,
    createdAt: reviveDate(raw.createdAt) ?? new Date(),
    updatedAt: reviveDate(raw.updatedAt) ?? new Date(),
    lastPlayed: reviveDate(raw.lastPlayed),
    timesPlayed: typeof raw.timesPlayed === 'number' ? raw.timesPlayed : 0,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
  }
}

function reviveSetlist(raw: Setlist): Setlist {
  return {
    ...raw,
    songIds: Array.isArray(raw.songIds) ? raw.songIds : [],
    createdAt: reviveDate(raw.createdAt) ?? new Date(),
    date: reviveDate(raw.date),
  }
}

export interface ParsedGigsync {
  songs: Song[]
  setlists: Setlist[]
  profile: string | null
  settings: string | null
  stats: string | null
}

/** Reads a .gigsync or an old backup .json. Throws when it isn't one. */
export function parseGigsync(text: string): ParsedGigsync {
  const data = JSON.parse(text) as Record<string, unknown>
  if (!data || typeof data !== 'object' || (!Array.isArray(data.songs) && !Array.isArray(data.setlists))) {
    throw new Error('No es un fichero de GigSync')
  }
  const songs = (Array.isArray(data.songs) ? (data.songs as Song[]) : []).filter((s) => s && typeof s.id === 'string' && typeof s.title === 'string')
  const setlists = (Array.isArray(data.setlists) ? (data.setlists as Setlist[]) : []).filter((s) => s && typeof s.id === 'string')
  return {
    songs: songs.map(reviveSong),
    setlists: setlists.map(reviveSetlist),
    profile: typeof data.profile === 'string' ? data.profile : null,
    settings: typeof data.settings === 'string' ? data.settings : null,
    stats: typeof data.stats === 'string' ? data.stats : null,
  }
}

/** Safe file name from a title. */
export function fileSlug(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return slug || 'gigsync'
}

/**
 * Hands a file to the device: the native share sheet (AirDrop, WhatsApp, Drive…)
 * when it can share files, otherwise a download.
 */
export async function shareOrDownload(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  if (nav?.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: file.name })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // Any other failure: fall through to a plain download.
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return 'downloaded'
}

export function gigsyncToFile(content: GigsyncFile, name: string): File {
  return new File([JSON.stringify(content)], `${fileSlug(name)}${GIGSYNC_EXTENSION}`, { type: GIGSYNC_MIME })
}

export function midiToFile(bytes: Uint8Array, name: string): File {
  return new File([bytes as BlobPart], `${fileSlug(name)}.mid`, { type: 'audio/midi' })
}
