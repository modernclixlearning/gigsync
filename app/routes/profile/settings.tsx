import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback } from 'react'
import { cn } from '~/lib/utils'
import { useSettings } from '~/hooks/useSettings'
import { AppearanceSettings } from '~/components/profile/AppearanceSettings'
import { MetronomeSettings } from '~/components/profile/MetronomeSettings'
import { TunerSettings } from '~/components/profile/TunerSettings'
import { PerformanceSettings } from '~/components/profile/PerformanceSettings'
import { PlayerSettings } from '~/components/profile/PlayerSettings'
import { DataSettings } from '~/components/profile/DataSettings'
import { BottomNav } from '~/components/navigation'
import { ROUTES } from '~/lib/routes'

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

  const handleExportData = useCallback(() => {
    // Export all data as JSON
    const data = {
      profile: localStorage.getItem('gigsync_profile'),
      settings: localStorage.getItem('gigsync_settings'),
      stats: localStorage.getItem('gigsync_stats'),
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

        if (data.profile) {
          localStorage.setItem('gigsync_profile', data.profile)
        }
        if (data.settings) {
          localStorage.setItem('gigsync_settings', data.settings)
        }
        if (data.stats) {
          localStorage.setItem('gigsync_stats', data.stats)
        }

        // Reload to apply changes
        window.location.reload()
      } catch (error) {
        console.error('Failed to import data:', error)
        alert('Failed to import data. Please check the file format.')
      }
    }
    input.click()
  }, [])

  const handleDeleteAllData = useCallback(() => {
    localStorage.removeItem('gigsync_profile')
    localStorage.removeItem('gigsync_settings')
    localStorage.removeItem('gigsync_stats')
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
    </div>
  )
}
