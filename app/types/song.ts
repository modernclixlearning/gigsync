// Song Types - Extended types for song player functionality

import type { Song } from './setlist'

export type { Song }

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
}

export interface SongPlayerState {
  isPlaying: boolean
  currentPosition: number
  autoScrollSpeed: number
  isAutoScrollEnabled: boolean
  transpose: number
  showChords: boolean
  fontSize: number
  metronomeSoundEnabled: boolean
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
