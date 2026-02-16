import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import * as Tone from 'tone'
import { db } from '~/lib/db'
import type { 
  Song, 
  CreateSongInput, 
  UpdateSongInput, 
  SongPlayerState,
  SongFilterOptions 
} from '~/types'

// ============================================================================
// useSongLibrary - CRUD operations for songs with Dexie.js
// ============================================================================

export interface UseSongLibraryReturn {
  songs: Song[]
  isLoading: boolean
  error: Error | null
  createSong: (input: CreateSongInput) => Promise<string>
  updateSong: (id: string, input: UpdateSongInput) => Promise<void>
  deleteSong: (id: string) => Promise<void>
  filterOptions: SongFilterOptions
  setFilterOptions: (options: Partial<SongFilterOptions>) => void
  filteredSongs: Song[]
}

export function useSongLibrary(): UseSongLibraryReturn {
  const queryClient = useQueryClient()
  const [filterOptions, setFilterOptionsState] = useState<SongFilterOptions>({
    filter: 'all',
    searchQuery: '',
    selectedTags: []
  })

  // Query: Fetch all songs
  const { data: songs = [], isLoading, error } = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      return await db.songs.orderBy('title').toArray()
    }
  })

  // Mutation: Create song
  const createMutation = useMutation({
    mutationFn: async (input: CreateSongInput): Promise<string> => {
      const id = crypto.randomUUID()
      const now = new Date()
      const song: Song = {
        id,
        title: input.title,
        artist: input.artist,
        bpm: input.bpm ?? 120,
        key: input.key ?? 'C',
        timeSignature: input.timeSignature ?? '4/4',
        duration: input.duration ?? 0,
        lyrics: input.lyrics ?? '',
        tags: input.tags ?? [],
        timesPlayed: 0,
        notes: input.notes,
        createdAt: now,
        updatedAt: now
      }
      await db.songs.add(song)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
    }
  })

  // Mutation: Update song
  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateSongInput }) => {
      await db.songs.update(id, {
        ...input,
        updatedAt: new Date()
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
    }
  })

  // Mutation: Delete song
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await db.songs.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
    }
  })

  // Filter songs based on options
  const filteredSongs = songs.filter((song) => {
    // Search query filter
    if (filterOptions.searchQuery) {
      const query = filterOptions.searchQuery.toLowerCase()
      if (
        !song.title.toLowerCase().includes(query) &&
        !song.artist.toLowerCase().includes(query)
      ) {
        return false
      }
    }

    // Key filter
    if (filterOptions.selectedKey && song.key !== filterOptions.selectedKey) {
      return false
    }

    // Artist filter
    if (
      filterOptions.selectedArtist &&
      song.artist !== filterOptions.selectedArtist
    ) {
      return false
    }

    // Tags filter
    if (filterOptions.selectedTags?.length) {
      if (!filterOptions.selectedTags.some((tag) => song.tags.includes(tag))) {
        return false
      }
    }

    // Filter type
    switch (filterOptions.filter) {
      case 'recent':
        const lastWeek = new Date()
        lastWeek.setDate(lastWeek.getDate() - 7)
        return song.lastPlayed && song.lastPlayed >= lastWeek
      case 'favorites':
        return song.tags.includes('favorite')
      default:
        return true
    }
  })

  const setFilterOptions = useCallback((options: Partial<SongFilterOptions>) => {
    setFilterOptionsState((prev) => ({ ...prev, ...options }))
  }, [])

  return {
    songs,
    isLoading,
    error: error as Error | null,
    createSong: createMutation.mutateAsync,
    updateSong: (id: string, input: UpdateSongInput) =>
      updateMutation.mutateAsync({ id, input }),
    deleteSong: deleteMutation.mutateAsync,
    filterOptions,
    setFilterOptions,
    filteredSongs
  }
}

// ============================================================================
// useSong - Single song operations
// ============================================================================

export interface UseSongReturn {
  song: Song | null
  isLoading: boolean
  error: Error | null
  updateSong: (input: UpdateSongInput) => Promise<void>
  incrementPlayCount: () => Promise<void>
}

export function useSong(songId: string): UseSongReturn {
  const queryClient = useQueryClient()

  // Query: Fetch single song
  const { data: song = null, isLoading, error } = useQuery({
    queryKey: ['song', songId],
    queryFn: async () => {
      return (await db.songs.get(songId)) ?? null
    },
    enabled: !!songId
  })

  // Mutation: Update song
  const updateMutation = useMutation({
    mutationFn: async (input: UpdateSongInput) => {
      await db.songs.update(songId, {
        ...input,
        updatedAt: new Date()
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['song', songId] })
      queryClient.invalidateQueries({ queryKey: ['songs'] })
    }
  })

  // Mutation: Increment play count
  const incrementPlayMutation = useMutation({
    mutationFn: async () => {
      const currentSong = await db.songs.get(songId)
      if (currentSong) {
        await db.songs.update(songId, {
          timesPlayed: currentSong.timesPlayed + 1,
          lastPlayed: new Date()
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['song', songId] })
      queryClient.invalidateQueries({ queryKey: ['songs'] })
    }
  })

  return {
    song,
    isLoading,
    error: error as Error | null,
    updateSong: updateMutation.mutateAsync,
    incrementPlayCount: incrementPlayMutation.mutateAsync
  }
}

// ============================================================================
// useSongPlayer - Song player state management
// ============================================================================

export interface UseSongPlayerReturn {
  state: SongPlayerState
  play: () => void
  pause: () => void
  togglePlay: () => void
  setPosition: (position: number) => void
  setAutoScrollSpeed: (speed: number) => void
  toggleAutoScroll: () => void
  transpose: (semitones: number) => void
  resetTranspose: () => void
  toggleChords: () => void
  setFontSize: (size: number) => void
  toggleMetronomeSound: () => void
}

export function useSongPlayer(): UseSongPlayerReturn {
  const [state, setState] = useState<SongPlayerState>({
    isPlaying: false,
    currentPosition: 0,
    autoScrollSpeed: 50,
    isAutoScrollEnabled: false,
    transpose: 0,
    showChords: true,
    fontSize: 16,
    metronomeSoundEnabled: false
  })

  const play = useCallback(async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start()
    }
    setState((prev) => ({ ...prev, isPlaying: true }))
  }, [])

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }))
  }, [])

  const togglePlay = useCallback(async () => {
    // Pre-warm Tone.js AudioContext from user gesture (click handler)
    // This MUST happen in a direct user interaction, not in useEffect
    if (Tone.context.state !== 'running') {
      await Tone.start()
    }
    setState((prev) => {
      const newState = {
        ...prev,
        isPlaying: !prev.isPlaying,
        // Auto-enable autoscroll when starting playback
        isAutoScrollEnabled: !prev.isPlaying ? true : prev.isAutoScrollEnabled
      }
      return newState
    })
  }, [])

  const setPosition = useCallback((position: number) => {
    setState((prev) => ({ ...prev, currentPosition: position }))
  }, [])

  const setAutoScrollSpeed = useCallback((speed: number) => {
    setState((prev) => ({ ...prev, autoScrollSpeed: Math.max(0, Math.min(100, speed)) }))
  }, [])

  const toggleAutoScroll = useCallback(() => {
    setState((prev) => ({ ...prev, isAutoScrollEnabled: !prev.isAutoScrollEnabled }))
  }, [])

  const transpose = useCallback((semitones: number) => {
    setState((prev) => ({
      ...prev,
      transpose: ((prev.transpose + semitones + 12) % 12)
    }))
  }, [])

  const resetTranspose = useCallback(() => {
    setState((prev) => ({ ...prev, transpose: 0 }))
  }, [])

  const toggleChords = useCallback(() => {
    setState((prev) => ({ ...prev, showChords: !prev.showChords }))
  }, [])

  const setFontSize = useCallback((size: number) => {
    setState((prev) => ({ ...prev, fontSize: Math.max(12, Math.min(32, size)) }))
  }, [])

  const toggleMetronomeSound = useCallback(() => {
    setState((prev) => ({ ...prev, metronomeSoundEnabled: !prev.metronomeSoundEnabled }))
  }, [])

  return {
    state,
    play,
    pause,
    togglePlay,
    setPosition,
    setAutoScrollSpeed,
    toggleAutoScroll,
    transpose,
    resetTranspose,
    toggleChords,
    setFontSize,
    toggleMetronomeSound
  }
}
