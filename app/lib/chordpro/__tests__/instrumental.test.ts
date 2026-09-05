import { describe, it, expect } from 'vitest'
import { getSectionType } from '../instrumental'

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
