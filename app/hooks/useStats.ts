import { useState, useCallback, useEffect } from 'react'
import type { UserStats } from '~/types/profile'

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
    // TODO: In the future, calculate real stats from songs and setlists in IndexedDB
    // For now, return mock stats or stored stats
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.lastSessionDate) {
          parsed.lastSessionDate = new Date(parsed.lastSessionDate)
        }
        return parsed
      }
      
      // Return mock data for demo purposes
      return {
        totalSongs: 12,
        totalSetlists: 3,
        mostPlayedSong: {
          id: '1',
          title: 'Hotel California',
          playCount: 15,
        },
        totalPracticeMinutes: 240,
        lastSessionDate: new Date(),
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
