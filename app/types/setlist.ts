// Setlist Types - Re-exported from shared contracts

/** Whether the beat-follows-the-lyric highlight tints the text or the background. */
export type BeatHighlightMode = 'text' | 'background'

/**
 * Per-song overrides for player controls that otherwise reset every session
 * (see SongPlayerState). Resolution order for any field is: song override
 * → setlist override (Setlist.playerOverrides, only when opened from a
 * setlist) → global default in PlayerPreferences → hardcoded fallback.
 * Undefined per-field falls through to the next tier.
 */
export interface PlayerOverrides {
  autoScrollSpeed?: number
  fontSize?: number
  linesPerBlock?: number
  contentWidth?: number
  transpose?: number
  /** Font size (px) of the floating chord labels above the lyrics. */
  chordFontSize?: number
  beatHighlightMode?: BeatHighlightMode
  beatHighlightTextColor?: string
  beatHighlightBgColor?: string
  /** Player screen background color. Unset = theme default (light/dark). */
  backgroundColor?: string
  /** Lyrics text color. Unset = theme default (light/dark). */
  lyricsTextColor?: string
}

export type PlayerOverrideKey = keyof PlayerOverrides
export type PlayerOverrideValue<K extends PlayerOverrideKey> = Required<PlayerOverrides>[K]

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
  playerOverrides?: PlayerOverrides
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
  playerOverrides?: PlayerOverrides
}
