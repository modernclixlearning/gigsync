import { describe, it, expect, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Song } from '~/types'

const store = vi.hoisted(() => ({
  songs: [] as Partial<Song>[],
  setlists: [{ id: 'sl1', songIds: ['in-setlist'] }],
  bulkDelete: vi.fn(),
}))

vi.mock('~/lib/db', () => ({
  db: {
    songs: {
      toArray: vi.fn(() => Promise.resolve(store.songs)),
      bulkDelete: store.bulkDelete,
    },
    setlists: { toArray: vi.fn(() => Promise.resolve(store.setlists)) },
  },
}))

import { useDiscardUntouchedNewSongs } from '../useSongs'

const blank = { title: 'Nueva canción', artist: '', lyrics: '', notes: '' }

describe('useDiscardUntouchedNewSongs', () => {
  it('deletes only blank "Add song" songs nobody filled in, and none that sit in a setlist', async () => {
    store.songs = [
      { ...blank, id: 'blank' },
      { ...blank, id: 'with-artist', artist: 'Serú Girán' },
      { ...blank, id: 'with-lyrics', lyrics: '[E]Con el tiempo' },
      { ...blank, id: 'in-setlist' },
      { ...blank, id: 'real', title: 'Seminare', artist: 'Serú Girán' },
    ]
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children)
    const { result } = renderHook(() => useDiscardUntouchedNewSongs(), { wrapper })

    await result.current()
    expect(store.bulkDelete).toHaveBeenCalledWith(['blank'])
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['songs'] })

    store.bulkDelete.mockClear()
    store.songs = [{ ...blank, id: 'real', title: 'Seminare' }]
    await result.current()
    expect(store.bulkDelete).not.toHaveBeenCalled()
  })
})
