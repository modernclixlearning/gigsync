/**
 * "Add song" creates a blank song right away and opens it in the player with
 * the Editar panel, so the new song is written next to how it looks — like
 * any other edit. A blank song nobody touched is thrown away later
 * (see useDiscardUntouchedNewSongs).
 */

import type { CreateSongInput, Song } from '~/types'

export const NEW_SONG_TITLE = 'Nueva canción'

export function blankSongInput(): CreateSongInput {
  return {
    title: NEW_SONG_TITLE,
    artist: '',
    bpm: 120,
    key: 'C',
    timeSignature: '4/4',
    duration: 0,
    lyrics: '',
    tags: [],
    notes: '',
  }
}

/** Still exactly as "Add song" created it: default title, no artist, lyrics, notes or video. */
export function isUntouchedNewSong(
  song: Pick<Song, 'title' | 'artist'> & Partial<Pick<Song, 'lyrics' | 'notes' | 'youtubeUrl'>>
): boolean {
  return (
    song.title === NEW_SONG_TITLE &&
    !song.artist.trim() &&
    !(song.lyrics ?? '').trim() &&
    !(song.notes ?? '').trim() &&
    !song.youtubeUrl
  )
}
