// Song Types - Extended types for song player functionality

import type { Song, PlayerOverrides, PlayerOverrideKey, BeatHighlightMode } from './setlist'

export type { Song, PlayerOverrides, PlayerOverrideKey, BeatHighlightMode }

export interface CreateSongInput {
  title: string
  artist: string
  bpm?: number
  key?: string
  timeSignature?: string
  duration?: number
  lyrics?: string
  tags?: string[]
  notes?: string
}

export interface UpdateSongInput {
  title?: string
  artist?: string
  bpm?: number
  key?: string
  timeSignature?: string
  duration?: number
  lyrics?: string
  tags?: string[]
  notes?: string
  playerOverrides?: PlayerOverrides
}

export interface SongPlayerState {
  isPlaying: boolean
  currentPosition: number
  autoScrollSpeed: number
  isAutoScrollEnabled: boolean
  transpose: number
  /** Enharmonic spelling override for the current transpose (null = minimal-accidentals default for the target key). */
  transposePreferFlats: boolean | null
  showChords: boolean
  /** Chord-grid editing UI (drag/resize/subdivide). Entered explicitly, never as a side effect of pausing. */
  isEditMode: boolean
  fontSize: number
  metronomeSoundEnabled: boolean
  /** Consecutive lyric lines merged into one reading block (read mode only). 1 = each original line its own block. */
  linesPerBlock: number
  /** Max width (px) of the centered reading column — smaller = more side margin. Shared by the lyrics and the footer controls. */
  contentWidth: number
  /** Font size (px) of the floating chord labels above the lyrics. */
  chordFontSize: number
  beatHighlightMode: BeatHighlightMode
  beatHighlightTextColor: string
  beatHighlightBgColor: string
  /** Player screen background color override. null = theme default (light/dark). */
  backgroundColor: string | null
  /** Lyrics text color override. null = theme default (light/dark). */
  lyricsTextColor: string | null
}

export interface LyricLine {
  text: string
  chords: ChordPosition[]
  timestamp?: number
}

export interface ChordPosition {
  chord: string
  position: number
}

export interface ChordProSong {
  title: string
  artist: string
  key?: string
  tempo?: number
  timeSignature?: string
  lines: LyricLine[]
}

export type SongFilter = 'all' | 'recent' | 'favorites' | 'byKey' | 'byArtist'

export interface SongFilterOptions {
  filter: SongFilter
  searchQuery: string
  selectedKey?: string
  selectedArtist?: string
  selectedTags?: string[]
}
