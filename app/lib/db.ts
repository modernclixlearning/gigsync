import Dexie, { type Table } from 'dexie'
import type { Song, Setlist } from '~/types/setlist'

export class GigSyncDB extends Dexie {
  songs!: Table<Song>
  setlists!: Table<Setlist>

  constructor() {
    super('gigsync')
    this.version(1).stores({
      songs: 'id, title, artist, bpm, key, *tags, createdAt',
      setlists: 'id, name, venue, date, createdAt'
    })
  }
}

export const db = new GigSyncDB()
