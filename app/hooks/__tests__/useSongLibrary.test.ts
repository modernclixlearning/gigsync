import { describe, it, expect, vi, beforeEach } from 'vitest'
import React, { createElement } from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSongLibrary } from '../useSongs'
import type { Song, Setlist } from '~/types'

const createMockSong = (overrides: Partial<Song> = {}): Song => ({
  id: 's1',
  title: 'Song 1',
  artist: 'Artist 1',
  bpm: 120,
  key: 'C',
  timeSignature: '4/4',
  duration: 120,
  lyrics: '',
  tags: [],
  timesPlayed: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

const createMockSetlist = (
  overrides: Partial<Setlist> = {}
): Setlist => ({
  id: 'sl1',
  name: 'Set A',
  songIds: [],
  totalDuration: 0,
  createdAt: new Date(),
  ...overrides
})

vi.mock('~/lib/db', () => {
  const baseSong = {
    id: '',
    title: '',
    artist: '',
    bpm: 120,
    key: 'C',
    timeSignature: '4/4',
    duration: 0,
    lyrics: '',
    tags: [],
    timesPlayed: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  const baseSetlist = {
    id: '',
    name: '',
    songIds: [],
    totalDuration: 0,
    createdAt: new Date()
  }

  const mockSongs = new Map<string, Song>()
  const mockSetlists = new Map<string, Setlist>()

  const resetMock = () => {
    mockSongs.clear()
    mockSongs.set('s1', { ...baseSong, id: 's1', title: 'Song 1', duration: 120 })
    mockSongs.set('s2', { ...baseSong, id: 's2', title: 'Song 2', duration: 180, artist: 'Artist 2' })
    mockSetlists.clear()
    mockSetlists.set('sl1', { ...baseSetlist, id: 'sl1', name: 'Set A', songIds: ['s1', 's2'], totalDuration: 300 })
    mockSetlists.set('sl2', { ...baseSetlist, id: 'sl2', name: 'Set B', songIds: ['s1'], totalDuration: 120 })
  }
  resetMock()

  return {
    db: {
      songs: {
        get: vi.fn((id: string) => Promise.resolve(mockSongs.get(id))),
        delete: vi.fn((id: string) => {
          mockSongs.delete(id)
          return Promise.resolve()
        }),
        orderBy: vi.fn(() => ({
          toArray: vi.fn(() =>
            Promise.resolve(
              Array.from(mockSongs.values()).sort((a, b) =>
                a.title.localeCompare(b.title)
              )
            )
          )
        }))
      },
      setlists: {
        toArray: vi.fn(() =>
          Promise.resolve(Array.from(mockSetlists.values()))
        ),
        update: vi.fn(
          (id: string, data: Partial<Setlist>) => {
            const existing = mockSetlists.get(id)
            if (existing) {
              mockSetlists.set(id, { ...existing, ...data })
            }
            return Promise.resolve()
          }
        )
      }
    },
    __resetMock: resetMock
  }
})

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useSongLibrary - deleteSong cascade', () => {
  beforeEach(async () => {
    const mod = await import('~/lib/db') as { db: typeof import('~/lib/db')['db']; __resetMock?: () => void }
    mod.__resetMock?.()
    vi.mocked(mod.db.songs.get).mockClear()
    vi.mocked(mod.db.songs.delete).mockClear()
    vi.mocked(mod.db.setlists.toArray).mockClear()
    vi.mocked(mod.db.setlists.update).mockClear()
  })

  it('should remove song from setlists and recalculate totalDuration when deleting a song', async () => {
    const { db } = await import('~/lib/db')
    const { result } = renderHook(() => useSongLibrary(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.songs.length).toBeGreaterThan(0)
    })

    await act(async () => {
      await result.current.deleteSong('s1')
    })

    expect(db.songs.delete).toHaveBeenCalledWith('s1')

    const setlistsUpdate = (db.setlists.update as ReturnType<typeof vi.fn>)
    expect(setlistsUpdate).toHaveBeenCalledTimes(2)

    const updateCalls = setlistsUpdate.mock.calls
    const sl1Update = updateCalls.find((c: unknown[]) => c[0] === 'sl1')
    const sl2Update = updateCalls.find((c: unknown[]) => c[0] === 'sl2')

    expect(sl1Update).toBeDefined()
    expect(sl1Update![1]).toEqual({
      songIds: ['s2'],
      totalDuration: 180
    })

    expect(sl2Update).toBeDefined()
    expect(sl2Update![1]).toEqual({
      songIds: [],
      totalDuration: 0
    })
  })

  it('should delete song normally when no setlists contain it', async () => {
    const { db } = await import('~/lib/db')
    vi.mocked(db.setlists.toArray).mockResolvedValueOnce([
      createMockSetlist({
        id: 'sl3',
        name: 'Set C',
        songIds: ['s2'],
        totalDuration: 180
      })
    ])

    const { result } = renderHook(() => useSongLibrary(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.songs.length).toBeGreaterThan(0)
    })

    await act(async () => {
      await result.current.deleteSong('s1')
    })

    expect(db.songs.delete).toHaveBeenCalledWith('s1')
    expect(db.setlists.update).not.toHaveBeenCalled()
  })

  it('should update single setlist when song is in one setlist only', async () => {
    const { db } = await import('~/lib/db')
    vi.mocked(db.setlists.toArray).mockResolvedValueOnce([
      createMockSetlist({
        id: 'sl-single',
        name: 'Single Set',
        songIds: ['s1'],
        totalDuration: 120
      })
    ])

    const { result } = renderHook(() => useSongLibrary(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.songs.length).toBeGreaterThan(0)
    })

    await act(async () => {
      await result.current.deleteSong('s1')
    })

    expect(db.songs.delete).toHaveBeenCalledWith('s1')
    expect(db.setlists.update).toHaveBeenCalledTimes(1)
    expect(db.setlists.update).toHaveBeenCalledWith('sl-single', {
      songIds: [],
      totalDuration: 0
    })
  })

  it('should throw when deleting non-existent song', async () => {
    const { db } = await import('~/lib/db')
    vi.mocked(db.songs.get).mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useSongLibrary(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.songs).toBeDefined()
    })

    await expect(
      act(async () => {
        await result.current.deleteSong('non-existent')
      })
    ).rejects.toThrow('Song not found')

    expect(db.songs.delete).not.toHaveBeenCalled()
  })

  it('should invalidate setlist queries after deleteSong', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    function Wrapper({ children }: { children: React.ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children)
    }

    const { result } = renderHook(() => useSongLibrary(), {
      wrapper: Wrapper
    })

    await waitFor(() => {
      expect(result.current.songs.length).toBeGreaterThan(0)
    })

    await act(async () => {
      await result.current.deleteSong('s1')
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['songs'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['setlists'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['setlist'] })
  })
})
