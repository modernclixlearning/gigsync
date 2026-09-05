// Setlist Types - Re-exported from shared contracts

/**
 * Per-song overrides for player controls that otherwise reset every session
 * (see SongPlayerState). Undefined per-field = fall back to the global
 * default in PlayerPreferences, then to the hardcoded default.
 */
export interface PlayerOverrides {
  autoScrollSpeed?: number
  fontSize?: number
  linesPerBlock?: number
  contentWidth?: number
  transpose?: number
}

export type PlayerOverrideKey = keyof PlayerOverrides

export interface Song {
  id: string
  title: string
  artist: string
  bpm: number
  key: string
  timeSignature: string
  duration: number
  lyrics: string
  tags: string[]
  lastPlayed?: Date
  timesPlayed: number
  notes?: string
  createdAt: Date
  updatedAt: Date
  playerOverrides?: PlayerOverrides
}

export interface Setlist {
  id: string
  name: string
  songIds: string[]
  totalDuration: number
  venue?: string
  date?: Date
  createdAt: Date
}

export interface CreateSetlistInput {
  name: string
  venue?: string
  date?: Date
  songIds?: string[]
}

export interface UpdateSetlistInput {
  name?: string
  songIds?: string[]
  venue?: string
  date?: Date
}
