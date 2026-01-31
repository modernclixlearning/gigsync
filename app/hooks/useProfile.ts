import { useState, useCallback, useEffect } from 'react'
import type { UserProfile, DEFAULT_PROFILE } from '~/types/profile'

export interface UseProfileReturn {
  profile: UserProfile | null
  isLoading: boolean
  error: Error | null
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  resetProfile: () => Promise<void>
}

const STORAGE_KEY = 'gigsync_profile'

function generateId(): string {
  return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getDefaultProfile(): UserProfile {
  return {
    id: generateId(),
    name: '',
    instrument: 'Guitar',
    band: '',
    avatar: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Load profile from storage on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true)
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          // Convert date strings back to Date objects
          parsed.createdAt = new Date(parsed.createdAt)
          parsed.updatedAt = new Date(parsed.updatedAt)
          setProfile(parsed)
        } else {
          // Create default profile
          const defaultProfile = getDefaultProfile()
          localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProfile))
          setProfile(defaultProfile)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load profile'))
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [])

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    try {
      setProfile((current: UserProfile | null) => {
        if (!current) return current
        const updated: UserProfile = {
          ...current,
          ...updates,
          updatedAt: new Date(),
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        return updated
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update profile'))
      throw err
    }
  }, [])

  const resetProfile = useCallback(async () => {
    try {
      const defaultProfile = getDefaultProfile()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProfile))
      setProfile(defaultProfile)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reset profile'))
      throw err
    }
  }, [])

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    resetProfile,
  }
}
