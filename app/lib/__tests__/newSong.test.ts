import { describe, it, expect } from 'vitest'
import { NEW_SONG_TITLE, blankSongInput, isUntouchedNewSong } from '../newSong'

const fresh = { ...blankSongInput(), youtubeUrl: undefined }

describe('isUntouchedNewSong', () => {
  it('is true for a song exactly as "Add song" created it', () => {
    expect(fresh.title).toBe(NEW_SONG_TITLE)
    expect(isUntouchedNewSong(fresh)).toBe(true)
  })

  it.each([
    ['a title', { title: 'Seminare' }],
    ['an artist', { artist: 'Serú Girán' }],
    ['lyrics', { lyrics: '[E]Con el tiempo' }],
    ['notes', { notes: 'capo 2' }],
    ['a video', { youtubeUrl: 'https://youtu.be/x' }],
  ])('is false once it has %s', (_, change) => {
    expect(isUntouchedNewSong({ ...fresh, ...change })).toBe(false)
  })
})
