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
      const newSetlist: Setlist = {
        id: uuidv4(),
        name: data.name,
        songIds: data.songIds ?? [],
        totalDuration: 0,
        venue: data.venue,
        date: data.date,
        createdAt: new Date()
      }
      await db.setlists.add(newSetlist)
      return newSetlist
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] })
    }
  })

  // Mutation: Update setlist
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSetlistInput }) => {
      await db.setlists.update(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] })
    }
  })

  // Mutation: Delete setlist
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
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
