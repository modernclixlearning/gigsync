import { useState, useCallback, useEffect } from 'react'

export interface SyncStatus {
  isSyncing: boolean
  lastSyncDate?: Date
  pendingChanges: number
  error?: string
}

export interface UseOfflineSyncReturn {
  status: SyncStatus
  isOnline: boolean
  sync: () => Promise<void>
  clearPendingChanges: () => void
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncDate: undefined,
    pendingChanges: 0,
    error: undefined,
  })

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && status.pendingChanges > 0) {
      // Could trigger automatic sync here in the future
    }
  }, [isOnline, status.pendingChanges])

  const sync = useCallback(async () => {
    if (!isOnline) {
      setStatus((prev) => ({
        ...prev,
        error: 'Cannot sync while offline',
      }))
      return
    }

    try {
      setStatus((prev) => ({
        ...prev,
        isSyncing: true,
        error: undefined,
      }))

      // TODO: Implement actual sync logic with cloud backend
      // This is a placeholder for future cloud backup feature
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncDate: new Date(),
        pendingChanges: 0,
      }))
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: err instanceof Error ? err.message : 'Sync failed',
      }))
    }
  }, [isOnline])

  const clearPendingChanges = useCallback(() => {
    setStatus((prev) => ({
      ...prev,
      pendingChanges: 0,
    }))
  }, [])

  return {
    status,
    isOnline,
    sync,
    clearPendingChanges,
  }
}
