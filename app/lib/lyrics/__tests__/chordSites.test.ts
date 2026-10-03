import { describe, it, expect } from 'vitest'
import { CHORD_SITES, buildChordSearchQuery } from '../chordSites'

describe('buildChordSearchQuery', () => {
  it('joins artist and title, collapsing whitespace', () => {
    expect(buildChordSearchQuery(' Soda  Stereo ', 'De música ligera')).toBe(
      'Soda Stereo De música ligera'
    )
  })

  it('works with only one of the two', () => {
    expect(buildChordSearchQuery('', 'Persiana americana')).toBe('Persiana americana')
  })
})

describe('CHORD_SITES', () => {
  it('builds encoded search URLs for each site', () => {
    const q = 'Soda Stereo De música ligera'
    const urls = Object.fromEntries(CHORD_SITES.map((s) => [s.id, s.buildUrl(q)]))
    const enc = encodeURIComponent(q)
    expect(urls['ultimate-guitar']).toBe(
      `https://www.ultimate-guitar.com/search.php?search_type=title&value=${enc}`
    )
    expect(urls['cifra-club']).toBe(`https://www.cifraclub.com/?q=${enc}`)
    expect(urls['lacuerda']).toBe(`https://acordes.lacuerda.net/busca.php?exp=${enc}`)
  })
})
