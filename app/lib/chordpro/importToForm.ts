/**
 * Applying an imported ChordPro file to the song form (pure): metadata it
 * carries replaces the form's, and its lines become the lyrics with the
 * chords back inline (`[Am]text`).
 */

import type { ChordProSong, CreateSongInput } from '~/types'

type LineWithChords = ChordProSong['lines'][number]

/** A parsed line back to ChordPro text, chords inline at their positions. */
export function lineToChordPro(line: LineWithChords): string {
  if (line.chords.length === 0) return line.text
  let result = ''
  let lastPos = 0
  for (const { chord, position } of [...line.chords].sort((a, b) => a.position - b.position)) {
    result += line.text.slice(lastPos, position) + `[${chord}]`
    lastPos = position
  }
  return result + line.text.slice(lastPos)
}

export function applyChordProImport(form: CreateSongInput, imported: ChordProSong): CreateSongInput {
  return {
    ...form,
    title: imported.title || form.title,
    artist: imported.artist || form.artist,
    key: imported.key || form.key,
    bpm: imported.tempo || form.bpm,
    timeSignature: imported.timeSignature || form.timeSignature,
    lyrics: imported.lines.map(lineToChordPro).join('\n'),
  }
}
