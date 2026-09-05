import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { cn } from '~/lib/utils'
import { db } from '~/lib/db'
import { useSettings } from '~/hooks/useSettings'
import { AppearanceSettings } from '~/components/profile/AppearanceSettings'
import { MetronomeSettings } from '~/components/profile/MetronomeSettings'
import { TunerSettings } from '~/components/profile/TunerSettings'
import { PerformanceSettings } from '~/components/profile/PerformanceSettings'
import { PlayerSettings } from '~/components/profile/PlayerSettings'
import { DataSettings } from '~/components/profile/DataSettings'
import { ImportConflictModal } from '~/components/profile/ImportConflictModal'
import { BottomNav } from '~/components/navigation'
import { ROUTES } from '~/lib/routes'
import {
  planSongImport,
  planSetlistImport,
  resolveSongsToWrite,
  type ConflictResolution,
  type SongConflict,
} from '~/lib/importMerge'
import type { Song, Setlist } from '~/types/setlist'

interface PendingImportData {
  newSongs: Song[]
  newSetlists: Setlist[]
  profile: string | null
  settings: string | null
  stats: string | null
}

const RELOAD_DELAY_MS = 1400

function summarizeImport(newSongsCount: number, newSetlistsCount: number, overwrittenCount: number): string {
  const parts: string[] = []
  if (newSongsCount > 0) {
    parts.push(`${newSongsCount} canción${newSongsCount === 1 ? '' : 'es'} nueva${newSongsCount === 1 ? '' : 's'}`)
  }
  if (overwrittenCount > 0) {
    parts.push(`${overwrittenCount} actualizada${overwrittenCount === 1 ? '' : 's'}`)
  }
  if (newSetlistsCount > 0) {
    parts.push(`${newSetlistsCount} setlist${newSetlistsCount === 1 ? '' : 's'}`)
  }
  if (parts.length === 0) {
    return 'Ya estaba todo al día — nada nuevo para importar.'
  }
  return `Importado: ${parts.join(', ')}.`
}

export const Route = createFileRoute('/profile/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const {
    settings,
    isLoading,
    updateSettings,
    updateMetronomeSettings,
    updateTunerSettings,
    updatePerformanceSettings,
    updatePlayerSettings,
    updateSyncSettings,
    resetSettings,
  } = useSettings()

  const [importConflicts, setImportConflicts] = useState<SongConflict[] | null>(null)
  const [pendingImport, setPendingImport] = useState<PendingImportData | null>(null)
  const [importToast, setImportToast] = useState<string | null>(null)

  const handleExportData = useCallback(async () => {
    const songs = await db.songs.toArray()
    const setlists = await db.setlists.toArray()

    const data = {
      version: 1,
      profile: localStorage.getItem('gigsync_profile'),
      settings: localStorage.getItem('gigsync_settings'),
      stats: localStorage.getItem('gigsync_stats'),
      songs,
      setlists,
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gigsync-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const applyNonConflictingImport = useCallback(
    async (newSongs: Song[], newSetlists: Setlist[], localData: Omit<PendingImportData, 'newSongs' | 'newSetlists'>) => {
      if (newSongs.length > 0) {
        await db.songs.bulkAdd(newSongs)
      }
      if (newSetlists.length > 0) {
        await db.setlists.bulkAdd(newSetlists)
      }
      if (localData.profile) {
        localStorage.setItem('gigsync_profile', localData.profile)
      }
      if (localData.settings) {
        localStorage.setItem('gigsync_settings', localData.settings)
      }
      if (localData.stats) {
        localStorage.setItem('gigsync_stats', localData.stats)
      }
    },
    []
  )

  const handleImportData = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)

        const importedSongs: Song[] = Array.isArray(data.songs) ? data.songs : []
        const importedSetlists: Setlist[] = Array.isArray(data.setlists) ? data.setlists : []

        const [existingSongs, existingSetlists] = await Promise.all([
          db.songs.toArray(),
          db.setlists.toArray(),
        ])

        const { newSongs, conflicts } = planSongImport(existingSongs, importedSongs)
        const { newSetlists } = planSetlistImport(existingSetlists, importedSetlists)

        const localData = {
          profile: data.profile ?? null,
          settings: data.settings ?? null,
          stats: data.stats ?? null,
        }

        if (conflicts.length === 0) {
          await applyNonConflictingImport(newSongs, newSetlists, localData)
          setImportToast(summarizeImport(newSongs.length, newSetlists.length, 0))
          setTimeout(() => window.location.reload(), RELOAD_DELAY_MS)
          return
        }

        // Hold off applying anything until the user resolves every conflict —
        // nothing is written to Dexie/localStorage yet at this point.
        setImportConflicts(conflicts)
        setPendingImport({ newSongs, newSetlists, ...localData })
      } catch (error) {
        console.error('Failed to import data:', error)
        alert('Failed to import data. Please check the file format.')
      }
    }
    input.click()
  }, [applyNonConflictingImport])

  const handleApplyImport = useCallback(
    async (resolutions: Record<string, ConflictResolution>) => {
      if (!importConflicts || !pendingImport) return

      await applyNonConflictingImport(pendingImport.newSongs, pendingImport.newSetlists, pendingImport)

      const songsToOverwrite = resolveSongsToWrite(importConflicts, resolutions)
      if (songsToOverwrite.length > 0) {
        await db.songs.bulkPut(songsToOverwrite)
      }

      setImportToast(
        summarizeImport(pendingImport.newSongs.length, pendingImport.newSetlists.length, songsToOverwrite.length)
      )
      setImportConflicts(null)
      setPendingImport(null)
      setTimeout(() => window.location.reload(), RELOAD_DELAY_MS)
    },
    [importConflicts, pendingImport, applyNonConflictingImport]
  )

  const handleCancelImport = useCallback(() => {
    setImportConflicts(null)
    setPendingImport(null)
  }, [])

  const handleDeleteAllData = useCallback(async () => {
    localStorage.removeItem('gigsync_profile')
    localStorage.removeItem('gigsync_settings')
    localStorage.removeItem('gigsync_stats')
    await db.songs.clear()
    await db.setlists.clear()
    window.location.reload()
  }, [])

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#101322] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#101322]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-50/80 dark:bg-[#101322]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              to={ROUTES.PROFILE}
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Settings
            </h1>
          </div>
          <button
            onClick={() => resetSettings()}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium',
              'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
              'hover:bg-slate-100 dark:hover:bg-slate-800',
              'transition-colors'
            )}
          >
            Reset
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-32 max-w-lg mx-auto">
        <div className="py-6 space-y-8">
          {/* Appearance */}
          <AppearanceSettings
            settings={settings}
            onThemeChange={(theme) => updateSettings({ theme })}
            onLanguageChange={(language) => updateSettings({ language })}
          />

          {/* Metronome */}
          <MetronomeSettings
            settings={settings.metronome}
            onUpdate={updateMetronomeSettings}
          />

          {/* Tuner */}
          <TunerSettings
            settings={settings.tuner}
            onUpdate={updateTunerSettings}
          />

          {/* Performance Mode */}
          <PerformanceSettings
            settings={settings.performance}
            onUpdate={updatePerformanceSettings}
          />

          {/* Player */}
          <PlayerSettings
            settings={settings.player}
            onUpdate={updatePlayerSettings}
          />

          {/* Data & Privacy */}
          <DataSettings
            settings={settings.sync}
            onUpdate={updateSyncSettings}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onDeleteAllData={handleDeleteAllData}
          />

          {/* About Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="text-lg">ℹ️</span>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                About
              </h3>
            </div>
            <div
              className={cn(
                'rounded-xl overflow-hidden',
                'bg-white dark:bg-[#111218]',
                'border border-slate-200 dark:border-[#3b3f54]',
                'divide-y divide-slate-100 dark:divide-[#3b3f54]'
              )}
            >
              <div className="flex items-center justify-between p-4">
                <span className="text-slate-900 dark:text-white">Version</span>
                <span className="text-slate-500 dark:text-slate-400">1.0.0</span>
              </div>
              <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-[#161a2a] transition-colors">
                <span className="text-slate-900 dark:text-white">Credits</span>
                <svg
                  className="w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
              <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-[#161a2a] transition-colors">
                <span className="text-slate-900 dark:text-white">Terms & Conditions</span>
                <svg
                  className="w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
              <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-[#161a2a] transition-colors">
                <span className="text-slate-900 dark:text-white">Privacy Policy</span>
                <svg
                  className="w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {importConflicts && importConflicts.length > 0 && (
        <ImportConflictModal
          conflicts={importConflicts}
          onCancel={handleCancelImport}
          onApply={handleApplyImport}
        />
      )}

      {importToast && (
        <div
          role="status"
          className={cn(
            'fixed bottom-24 left-1/2 -translate-x-1/2 z-50',
            'px-4 py-3 rounded-xl shadow-lg',
            'bg-slate-900 dark:bg-white text-white dark:text-slate-900',
            'flex items-center gap-2 text-sm font-medium',
            'max-w-[calc(100%-2rem)]'
          )}
        >
          <span>✅</span>
          <span>{importToast}</span>
        </div>
      )}
    </div>
  )
}
