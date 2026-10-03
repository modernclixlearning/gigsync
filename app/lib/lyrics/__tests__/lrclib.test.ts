import { describe, it, expect, vi } from 'vitest'
import {
  searchLyrics,
  normalizeLrclibRecord,
  stripLrcTimestamps,
  LyricsSearchError,
  LRCLIB_SEARCH_URL,
} from '../lrclib'

const record = {
  id: 37275035,
  name: 'De música ligera',
  trackName: 'De música ligera',
  artistName: 'Soda Stereo',
  albumName: 'Grandes Éxitos',
  duration: 212.4,
  instrumental: false,
  plainLyrics: 'Ella durmió al calor de las masas\nY yo desperté queriendo soñarla',
  syncedLyrics: '[00:20.12] Ella durmió al calor de las masas',
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

describe('normalizeLrclibRecord', () => {
  it('maps the LRCLIB shape to a search result', () => {
    expect(normalizeLrclibRecord(record)).toEqual({
      id: 37275035,
      title: 'De música ligera',
      artist: 'Soda Stereo',
      album: 'Grandes Éxitos',
      duration: 212,
      instrumental: false,
      lyrics: 'Ella durmió al calor de las masas\nY yo desperté queriendo soñarla',
    })
  })

  it('falls back to synced lyrics without timestamps when plain lyrics are missing', () => {
    const result = normalizeLrclibRecord({ ...record, plainLyrics: null })
    expect(result?.lyrics).toBe('Ella durmió al calor de las masas')
  })

  it('handles null album/duration/lyrics', () => {
    expect(
      normalizeLrclibRecord({
        id: 1,
        trackName: 'X',
        artistName: 'Y',
        albumName: null,
        duration: null,
        instrumental: true,
        plainLyrics: null,
        syncedLyrics: null,
      })
    ).toEqual({
      id: 1,
      title: 'X',
      artist: 'Y',
      album: '',
      duration: 0,
      instrumental: true,
      lyrics: '',
    })
  })

  it('rejects malformed records', () => {
    expect(normalizeLrclibRecord(null)).toBeNull()
    expect(normalizeLrclibRecord({ trackName: 'no id' })).toBeNull()
    expect(normalizeLrclibRecord({ id: 2 })).toBeNull()
  })
})

describe('stripLrcTimestamps', () => {
  it('removes leading [mm:ss.xx] tags', () => {
    expect(stripLrcTimestamps('[00:01.00] Uno\n[01:02.345]Dos\n[00:03]  ')).toBe('Uno\nDos')
  })
})

describe('searchLyrics', () => {
  it('queries the LRCLIB search endpoint with the encoded text', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([record]))
    const results = await searchLyrics('  Soda Stereo De música ligera ', {
      fetchImpl,
      isOnline: () => true,
    })

    expect(fetchImpl).toHaveBeenCalledWith(
      `${LRCLIB_SEARCH_URL}?q=${encodeURIComponent('Soda Stereo De música ligera')}`,
      expect.objectContaining({ headers: { Accept: 'application/json' } })
    )
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('De música ligera')
  })

  it('returns [] without calling the network for an empty query', async () => {
    const fetchImpl = vi.fn()
    expect(await searchLyrics('   ', { fetchImpl })).toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns [] when there are no results', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([]))
    expect(await searchLyrics('zzz', { fetchImpl, isOnline: () => true })).toEqual([])
  })

  it('throws an offline error without calling the network when offline', async () => {
    const fetchImpl = vi.fn()
    await expect(searchLyrics('x', { fetchImpl, isOnline: () => false })).rejects.toMatchObject({
      kind: 'offline',
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('throws a network error when fetch fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await searchLyrics('x', { fetchImpl, isOnline: () => true }).catch((e) => e)
    expect(error).toBeInstanceOf(LyricsSearchError)
    expect(error.kind).toBe('network')
  })

  it('throws an http error on non-2xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ message: 'x' }, 500))
    await expect(searchLyrics('x', { fetchImpl, isOnline: () => true })).rejects.toMatchObject({
      kind: 'http',
    })
  })

  it('throws an invalid error when the body is not an array', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ nope: true }))
    await expect(searchLyrics('x', { fetchImpl, isOnline: () => true })).rejects.toMatchObject({
      kind: 'invalid',
    })
  })

  it('rethrows abort errors untouched', async () => {
    const abort = new DOMException('Aborted', 'AbortError')
    const fetchImpl = vi.fn().mockRejectedValue(abort)
    await expect(searchLyrics('x', { fetchImpl, isOnline: () => true })).rejects.toBe(abort)
  })
})
