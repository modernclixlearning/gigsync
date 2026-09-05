import type { Song, Setlist } from '~/types/setlist'

export type ConflictResolution = 'keep-existing' | 'use-imported'

export interface SongConflict {
  id: string
  existing: Song
  imported: Song
  differingFields: SongContentField[]
}

export interface SongImportPlan {
  newSongs: Song[]
  conflicts: SongConflict[]
}

export interface SetlistImportPlan {
  newSetlists: Setlist[]
}

// Fields that represent the song's actual content. Usage stats
// (timesPlayed, lastPlayed, createdAt, updatedAt) are excluded on purpose —
// two devices always diverge on those, and prompting the user about it
// would turn every import into a wall of false conflicts.
const SONG_CONTENT_FIELDS = [
  'title',
  'artist',
  'bpm',
  'key',
  'timeSignature',
  'duration',
  'lyrics',
  'tags',
  'notes',
  'playerOverrides',
] as const

export type SongContentField = (typeof SONG_CONTENT_FIELDS)[number]

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return [...value].sort()
  }
  return value
}

function diffSongFields(a: Song, b: Song): SongContentField[] {
  return SONG_CONTENT_FIELDS.filter(
    (field) => JSON.stringify(normalize(a[field])) !== JSON.stringify(normalize(b[field]))
  )
}

export function planSongImport(existingSongs: Song[], importedSongs: Song[]): SongImportPlan {
  const existingById = new Map(existingSongs.map((song) => [song.id, song]))
  const newSongs: Song[] = []
  const conflicts: SongConflict[] = []

  for (const imported of importedSongs) {
    const existing = existingById.get(imported.id)
    if (!existing) {
      newSongs.push(imported)
      continue
    }

    const differingFields = diffSongFields(existing, imported)
    if (differingFields.length > 0) {
      conflicts.push({ id: imported.id, existing, imported, differingFields })
    }
    // Identical content under an existing id: nothing to do, keep as-is.
  }

  return { newSongs, conflicts }
}

// Setlists that already exist locally are left untouched — there's no
// per-field conflict UI for them, so overwriting could silently drop
// local changes. Only setlists new to this device get added.
export function planSetlistImport(
  existingSetlists: Setlist[],
  importedSetlists: Setlist[]
): SetlistImportPlan {
  const existingIds = new Set(existingSetlists.map((setlist) => setlist.id))
  const newSetlists = importedSetlists.filter((setlist) => !existingIds.has(setlist.id))
  return { newSetlists }
}

export function resolveSongsToWrite(
  conflicts: SongConflict[],
  resolutions: Record<string, ConflictResolution>
): Song[] {
  return conflicts
    .filter((conflict) => resolutions[conflict.id] === 'use-imported')
    .map((conflict) => conflict.imported)
}
