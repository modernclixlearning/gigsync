import { useState, useCallback, useEffect } from 'react'
import type { AppSettings, DEFAULT_SETTINGS } from '~/types/profile'

export interface UseSettingsReturn {
  settings: AppSettings | null
  isLoading: boolean
  error: Error | null
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>
  updateMetronomeSettings: (updates: Partial<AppSettings['metronome']>) => Promise<void>
  updateTunerSettings: (updates: Partial<AppSettings['tuner']>) => Promise<void>
  updatePerformanceSettings: (updates: Partial<AppSettings['performance']>) => Promise<void>
  updatePlayerSettings: (updates: Partial<AppSettings['player']>) => Promise<void>
  updateSyncSettings: (updates: Partial<AppSettings['sync']>) => Promise<void>
  resetSettings: () => Promise<void>
}

const STORAGE_KEY = 'gigsync_settings'

function generateId(): string {
  return `settings_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getDefaultSettings(): AppSettings {
  return {
    id: generateId(),
    theme: DEFAULT_SETTINGS.theme,
    language: DEFAULT_SETTINGS.language,
    metronome: { ...DEFAULT_SETTINGS.metronome },
    tuner: { ...DEFAULT_SETTINGS.tuner },
    performance: { ...DEFAULT_SETTINGS.performance },
    player: { ...DEFAULT_SETTINGS.player },
    sync: { ...DEFAULT_SETTINGS.sync },
    updatedAt: new Date(),
  }
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Load settings from storage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true)
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          // Convert date strings back to Date objects
          parsed.updatedAt = new Date(parsed.updatedAt)
          if (parsed.sync?.lastSyncDate) {
            parsed.sync.lastSyncDate = new Date(parsed.sync.lastSyncDate)
          }
          setSettings(parsed)
        } else {
          // Create default settings
          const defaultSettings = getDefaultSettings()
          localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings))
          setSettings(defaultSettings)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load settings'))
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    try {
      setSettings((current: AppSettings | null) => {
        if (!current) return current
        const updated: AppSettings = {
          ...current,
          ...updates,
          updatedAt: new Date(),
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        return updated
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update settings'))
      throw err
    }
  }, [])

  const updateMetronomeSettings = useCallback(
    async (updates: Partial<AppSettings['metronome']>) => {
      try {
        setSettings((current: AppSettings | null) => {
          if (!current) return current
          const updated: AppSettings = {
            ...current,
            metronome: { ...current.metronome, ...updates },
            updatedAt: new Date(),
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
          return updated
        })
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update metronome settings'))
        throw err
      }
    },
    []
  )

  const updateTunerSettings = useCallback(
    async (updates: Partial<AppSettings['tuner']>) => {
      try {
        setSettings((current: AppSettings | null) => {
          if (!current) return current
          const updated: AppSettings = {
            ...current,
            tuner: { ...current.tuner, ...updates },
            updatedAt: new Date(),
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
          return updated
        })
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update tuner settings'))
        throw err
      }
    },
    []
  )

  const updatePerformanceSettings = useCallback(
    async (updates: Partial<AppSettings['performance']>) => {
      try {
        setSettings((current: AppSettings | null) => {
          if (!current) return current
          const updated: AppSettings = {
            ...current,
            performance: { ...current.performance, ...updates },
            updatedAt: new Date(),
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
          return updated
        })
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update performance settings'))
        throw err
      }
    },
    []
  )

  const updatePlayerSettings = useCallback(
    async (updates: Partial<AppSettings['player']>) => {
      try {
        setSettings((current: AppSettings | null) => {
          if (!current) return current
          const updated: AppSettings = {
            ...current,
            player: { ...current.player, ...updates },
            updatedAt: new Date(),
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
          return updated
        })
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update player settings'))
        throw err
      }
    },
    []
  )

  const updateSyncSettings = useCallback(
    async (updates: Partial<AppSettings['sync']>) => {
      try {
        setSettings((current: AppSettings | null) => {
          if (!current) return current
          const updated: AppSettings = {
            ...current,
            sync: { ...current.sync, ...updates },
            updatedAt: new Date(),
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
          return updated
        })
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update sync settings'))
        throw err
      }
    },
    []
  )

  const resetSettings = useCallback(async () => {
    try {
      const defaultSettings = getDefaultSettings()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings))
      setSettings(defaultSettings)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reset settings'))
      throw err
    }
  }, [])

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    updateMetronomeSettings,
    updateTunerSettings,
    updatePerformanceSettings,
    updatePlayerSettings,
    updateSyncSettings,
    resetSettings,
  }
}
