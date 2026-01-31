import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '~/lib/db'
import type { Setlist, Song, UpdateSetlistInput } from '~/types'

export interface UseSetlistReturn {
  setlist: Setlist | null
  songs: Song[]
  isLoading: boolean
  addSong: (songId: string) => Promise<void>
  removeSong: (songId: string) => Promise<void>
  reorderSongs: (songIds: string[]) => Promise<void>
  updateSetlist: (data: UpdateSetlistInput) => Promise<void>
}

export function useSetlist(setlistId: string): UseSetlistReturn {
  const queryClient = useQueryClient()

  // Query: Fetch setlist
  const { data: setlist, isLoading: isLoadingSetlist } = useQuery({
    queryKey: ['setlist', setlistId],
    queryFn: async () => {
      return await db.setlists.get(setlistId) ?? null
    },
    enabled: !!setlistId
  })

  // Query: Fetch songs for setlist
  const { data: songs = [], isLoading: isLoadingSongs } = useQuery({
    queryKey: ['setlist-songs', setlistId, setlist?.songIds],
    queryFn: async () => {
      if (!setlist?.songIds.length) return []
      const allSongs = await db.songs.bulkGet(setlist.songIds)
      // Maintain order from songIds
      return setlist.songIds
        .map((id: string) => allSongs.find((s: Song | undefined) => s?.id === id))
        .filter((s: Song | undefined): s is Song => s !== undefined)
    },
    enabled: !!setlist?.songIds
  })

  // Mutation: Add song
  const addSongMutation = useMutation({
    mutationFn: async (songId: string) => {
      if (!setlist) return
      const song = await db.songs.get(songId)
      const newSongIds = [...setlist.songIds, songId]
      const newDuration = setlist.totalDuration + (song?.duration ?? 0)
      await db.setlists.update(setlistId, {
        songIds: newSongIds,
        totalDuration: newDuration
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlist', setlistId] })
      queryClient.invalidateQueries({ queryKey: ['setlists'] })
    }
  })

  // Mutation: Remove song
  const removeSongMutation = useMutation({
    mutationFn: async (songId: string) => {
      if (!setlist) return
      const song = await db.songs.get(songId)
      const newSongIds = setlist.songIds.filter((id: string) => id !== songId)
      const newDuration = Math.max(0, setlist.totalDuration - (song?.duration ?? 0))
      await db.setlists.update(setlistId, {
        songIds: newSongIds,
        totalDuration: newDuration
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlist', setlistId] })
      queryClient.invalidateQueries({ queryKey: ['setlists'] })
    }
  })

  // Mutation: Reorder songs
  const reorderMutation = useMutation({
    mutationFn: async (songIds: string[]) => {
      await db.setlists.update(setlistId, { songIds })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlist', setlistId] })
    }
  })

  // Mutation: Update setlist
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateSetlistInput) => {
      await db.setlists.update(setlistId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlist', setlistId] })
      queryClient.invalidateQueries({ queryKey: ['setlists'] })
    }
  })

  return {
    setlist: setlist ?? null,
    songs,
    isLoading: isLoadingSetlist || isLoadingSongs,
    addSong: addSongMutation.mutateAsync,
    removeSong: removeSongMutation.mutateAsync,
    reorderSongs: reorderMutation.mutateAsync,
    updateSetlist: updateMutation.mutateAsync
  }
}
