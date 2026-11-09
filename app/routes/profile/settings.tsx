import { createFileRoute } from '@tanstack/react-router'
import { useCallback } from 'react'
import { RotateCcw } from 'lucide-react'
import { db } from '~/lib/db'
import { useSettings } from '~/hooks/useSettings'
import { AppearanceSettings } from '~/components/profile/AppearanceSettings'
import { MetronomeSettings } from '~/components/profile/MetronomeSettings'
import { TunerSettings } from '~/components/profile/TunerSettings'
import { PerformanceSettings } from '~/components/profile/PerformanceSettings'
import { PlayerSettings } from '~/components/profile/PlayerSettings'
import { MidiClockSyncSettings } from '~/components/profile/MidiClockSyncSettings'
import { DataSettings } from '~/components/profile/DataSettings'
import { SettingsSection } from '~/components/profile/SettingsSection'
import { Page, PageLoading, buttonClass } from '~/components/layout'
import { ROUTES } from '~/lib/routes'
import { useGigsyncImport } from '~/components/share/useGigsyncImport'
import { DEFAULT_MIDI_CLOCK_SYNC } from '~/types/profile'

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
    updateMidiClockSyncSettings,
    resetSettings,
  } = useSettings()

  const { openPicker: handleImportData, node: importNode } = useGigsyncImport()

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

  const handleDeleteAllData = useCallback(async () => {
    localStorage.removeItem('gigsync_profile')
    localStorage.removeItem('gigsync_settings')
    localStorage.removeItem('gigsync_stats')
    await db.songs.clear()
    await db.setlists.clear()
    window.location.reload()
  }, [])

  if (isLoading || !settings) return <PageLoading />

  return (
    <Page
      title="Ajustes"
      width="narrow"
      backTo={ROUTES.PROFILE}
      actions={
        <button
          type="button"
          onClick={() => resetSettings()}
          title="Volver a los valores de fábrica"
          className={buttonClass('ghost', 'px-3')}
        >
          <RotateCcw className="w-4 h-4" />
          Restablecer
        </button>
      }
    >
      <div className="space-y-8">
        <AppearanceSettings
          settings={settings}
          onThemeChange={(theme) => updateSettings({ theme })}
          onLanguageChange={(language) => updateSettings({ language })}
        />

        <MetronomeSettings
          settings={settings.metronome}
          onUpdate={updateMetronomeSettings}
        />

        <TunerSettings
          settings={settings.tuner}
          onUpdate={updateTunerSettings}
        />

        <PerformanceSettings
          settings={settings.performance}
          onUpdate={updatePerformanceSettings}
        />

        <PlayerSettings
          settings={settings.player}
          onUpdate={updatePlayerSettings}
        />

        {/* DAW sync (MIDI Clock) */}
        <MidiClockSyncSettings
          settings={settings.midiClockSync ?? DEFAULT_MIDI_CLOCK_SYNC}
          onUpdate={updateMidiClockSyncSettings}
        />

        <DataSettings
          settings={settings.sync}
          onUpdate={updateSyncSettings}
          onExportData={handleExportData}
          onImportData={handleImportData}
          onDeleteAllData={handleDeleteAllData}
        />

        <SettingsSection title="Acerca de">
          <div className="flex items-center justify-between p-4">
            <span className="text-slate-900 dark:text-white">Versión</span>
            <span className="text-slate-500 dark:text-slate-400 tabular-nums">1.0.0</span>
          </div>
        </SettingsSection>
      </div>

      {importNode}
    </Page>
  )
}
