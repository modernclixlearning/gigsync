// Setlist Types - Re-exported from shared contracts

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
