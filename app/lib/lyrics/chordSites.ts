/**
 * External chord-sheet search links.
 *
 * GigSync never scrapes or proxies these sites (CORS + ToS): it only opens
 * their own search page in a new tab so the user can copy a chord sheet and
 * paste it back into the converter.
 */

export interface ChordSite {
  id: 'ultimate-guitar' | 'cifra-club' | 'lacuerda'
  name: string
  buildUrl: (query: string) => string
}

export const CHORD_SITES: ChordSite[] = [
  {
    id: 'ultimate-guitar',
    name: 'Ultimate Guitar',
    buildUrl: (q) =>
      `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(q)}`,
  },
  {
    id: 'cifra-club',
    name: 'Cifra Club',
    buildUrl: (q) => `https://www.cifraclub.com/?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'lacuerda',
    name: 'LaCuerda',
    buildUrl: (q) => `https://acordes.lacuerda.net/busca.php?exp=${encodeURIComponent(q)}`,
  },
]

/** "<artist> <title>" query, whitespace-collapsed. */
export function buildChordSearchQuery(artist: string, title: string): string {
  return `${artist} ${title}`.replace(/\s+/g, ' ').trim()
}
