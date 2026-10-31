import { describe, it, expect } from 'vitest'
import { applyChordProImport, lineToChordPro } from '../importToForm'
import type { CreateSongInput } from '~/types'

const FORM: CreateSongInput = {
  title: 'Sin título',
  artist: 'Yo',
  bpm: 120,
  key: 'C',
  timeSignature: '4/4',
  duration: 0,
  lyrics: 'vieja',
  tags: [],
  notes: '',
}

describe('lineToChordPro', () => {
  it('puts the chords back inline at their positions, in order', () => {
    const line = { text: 'Hola que tal', chords: [{ chord: 'G', position: 5 }, { chord: 'C', position: 0 }] }
    expect(lineToChordPro(line)).toBe('[C]Hola [G]que tal')
    expect(lineToChordPro({ text: 'sin acordes', chords: [] })).toBe('sin acordes')
  })
})

describe('applyChordProImport', () => {
  it('takes the metadata the file carries and replaces the lyrics', () => {
    const next = applyChordProImport(FORM, {
      title: 'Yesterday',
      artist: '',
      tempo: 96,
      lines: [{ text: 'Yesterday', chords: [{ chord: 'F', position: 0 }] }],
    })
    expect(next).toMatchObject({ title: 'Yesterday', artist: 'Yo', bpm: 96, key: 'C', lyrics: '[F]Yesterday' })
  })
})
