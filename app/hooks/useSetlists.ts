import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { db } from '~/lib/db'
import type { Setlist, CreateSetlistInput, UpdateSetlistInput } from '~/types'

export interface UseSetlistsReturn {
  setlists: Setlist[]
  isLoading: boolean
  error: Error | null
  createSetlist: (data: CreateSetlistInput) => Promise<Setlist>
  updateSetlist: (id: string, data: UpdateSetlistInput) => Promise<void>
  deleteSetlist: (id: string) => Promise<void>
}

export function useSetlists(): UseSetlistsReturn {
  const queryClient = useQueryClient()

  // Query: Fetch all setlists
  const { data: setlists = [], isLoading, error } = useQuery({
    queryKey: ['setlists'],
    queryFn: async () => {
      return await db.setlists.orderBy('createdAt').reverse().toArray()
    }
  })

  // Mutation: Create setlist
  const createMutation = useMutation({
    mutationFn: async (data: CreateSetlistInput): Promise<Setlist> => {
      // Validate name
      if (!data.name || !data.name.trim()) {
        throw new Error('Setlist name is required')
      }
      
      // Validate songs exist if provided
      if (data.songIds && data.songIds.length > 0) {
        const songs = await db.songs.bulkGet(data.songIds)
        const missingSongs = data.songIds.filter((id, index) => !songs[index])
        if (missingSongs.length > 0) {
          throw new Error(`Some songs not found: ${missingSongs.join(', ')}`)
        }
        
        // Calculate initial duration
        const totalDuration = songs.reduce((sum, song) => {
          return sum + (song?.duration ?? 0)
        }, 0)
        
        const newSetlist: Setlist = {
          id: uuidv4(),
          name: data.name.trim(),
          songIds: data.songIds,
          totalDuration,
          venue: data.venue,
          date: data.date,
          createdAt: new Date()
        }
        await db.setlists.add(newSetlist)
        return newSetlist
      } else {
        const newSetlist: Setlist = {
          id: uuidv4(),
          name: data.name.trim(),
          songIds: [],
          totalDuration: 0,
          venue: data.venue,
          date: data.date,
          createdAt: new Date()
        }
        await db.setlists.add(newSetlist)
        return newSetlist
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] })
    }
  })

  // Mutation: Update setlist
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSetlistInput }) => {
      // Validate setlist exists
      const existingSetlist = await db.setlists.get(id)
      if (!existingSetlist) {
        throw new Error('Setlist not found')
      }
      
      // Validate name if provided
      if (data.name !== undefined && !data.name.trim()) {
        throw new Error('Setlist name cannot be empty')
      }
      
      await db.setlists.update(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] })
    }
  })

  // Mutation: Delete setlist
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Validate setlist exists
      const setlist = await db.setlists.get(id)
      if (!setlist) {
        throw new Error('Setlist not found')
      }
      
      await db.setlists.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] })
    }
  })

  return {
    setlists,
    isLoading,
    error: error as Error | null,
    createSetlist: createMutation.mutateAsync,
    updateSetlist: (id, data) => updateMutation.mutateAsync({ id, data }),
    deleteSetlist: deleteMutation.mutateAsync
  }
}
