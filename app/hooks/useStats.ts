import { useState, useCallback, useEffect } from 'react'
import type { UserStats } from '~/types/profile'
import { db } from '~/lib/db'

export interface UseStatsReturn {
  stats: UserStats
  isLoading: boolean
  error: Error | null
  refreshStats: () => Promise<void>
}

const STORAGE_KEY = 'gigsync_stats'

function getDefaultStats(): UserStats {
  return {
    totalSongs: 0,
    totalSetlists: 0,
    mostPlayedSong: undefined,
    totalPracticeMinutes: 0,
    lastSessionDate: undefined,
  }
}

export function useStats(): UseStatsReturn {
  const [stats, setStats] = useState<UserStats>(getDefaultStats())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const calculateStats = useCallback(async (): Promise<UserStats> => {
    try {
      const totalSongs = await db.songs.count()
      const totalSetlists = await db.setlists.count()

      // Find the most played song
      const allSongs = await db.songs.toArray()
      const topSong = allSongs.sort((a, b) => b.timesPlayed - a.timesPlayed)[0]

      // Get practice minutes and session date from localStorage (session-based)
      const stored = localStorage.getItem(STORAGE_KEY)
      const parsed = stored ? JSON.parse(stored) : null

      return {
        totalSongs,
        totalSetlists,
        mostPlayedSong: topSong && topSong.timesPlayed > 0
          ? { id: topSong.id, title: topSong.title, playCount: topSong.timesPlayed }
          : undefined,
        totalPracticeMinutes: parsed?.totalPracticeMinutes ?? 0,
        lastSessionDate: parsed?.lastSessionDate ? new Date(parsed.lastSessionDate) : undefined,
      }
    } catch {
      return getDefaultStats()
    }
  }, [])

  const refreshStats = useCallback(async () => {
    try {
      setIsLoading(true)
      const calculatedStats = await calculateStats()
      setStats(calculatedStats)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(calculatedStats))
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh stats'))
    } finally {
      setIsLoading(false)
    }
  }, [calculateStats])

  // Load stats on mount
  useEffect(() => {
    refreshStats()
  }, [refreshStats])

  return {
    stats,
    isLoading,
    error,
    refreshStats,
  }
}
