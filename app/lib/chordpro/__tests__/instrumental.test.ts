import { describe, it, expect } from 'vitest'
import { getSectionType, isValidChord, normalizeTypedChord } from '../instrumental'

describe('getSectionType (gs#20)', () => {
  it('recognizes "estrofa" as a synonym for the "verse" section type', () => {
    expect(getSectionType('Estrofa')).toBe('verse')
    expect(getSectionType('Estrofa 2')).toBe('verse')
  })

  it('still recognizes the existing English/Spanish synonyms', () => {
    expect(getSectionType('Verse 1')).toBe('verse')
    expect(getSectionType('Estribillo')).toBe('chorus')
  })

  it('falls back to "other" for unrecognized section names', () => {
    expect(getSectionType('Coda final')).toBe('other')
  })
})

describe('isValidChord', () => {
  it.each(['Em', 'Cmaj7', 'Bm7b5', 'Bø', 'Bø7', 'E°', 'Eº7', 'C7#9', 'G7b9', 'C/E', 'F#m7b5/C'])('accepts %s', (chord) => {
    expect(isValidChord(chord)).toBe(true)
  })

  it.each(['H', 'Cxyz', 'C/H', 'hola'])('rejects %s', (chord) => {
    expect(isValidChord(chord)).toBe(false)
  })
})

describe('normalizeTypedChord', () => {
  it('capitalizes the root and keeps the quality as typed', () => {
    expect(normalizeTypedChord('cmaj7')).toBe('Cmaj7')
    expect(normalizeTypedChord('dmin7')).toBe('Dmin7')
    expect(normalizeTypedChord('bb')).toBe('Bb')
    expect(normalizeTypedChord('f#m7/c#')).toBe('F#m7/C#')
  })

  it('rejects text that is not a chord', () => {
    expect(normalizeTypedChord('cxyz')).toBeNull()
    expect(normalizeTypedChord('  ')).toBeNull()
  })
})
