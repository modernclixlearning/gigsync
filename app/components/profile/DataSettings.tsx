import { useState, useCallback } from 'react'
import type { AppSettings } from '~/types/profile'
import {
  SettingsSection,
  SettingsRow,
  SettingsToggle,
} from './SettingsSection'
import { cn } from '~/lib/utils'

export interface DataSettingsProps {
  settings: AppSettings['sync']
  onUpdate: (updates: Partial<AppSettings['sync']>) => void
  onExportData: () => void
  onImportData: () => void
  onDeleteAllData: () => void
}

export function DataSettings({
  settings,
  onUpdate,
  onExportData,
  onImportData,
  onDeleteAllData,
}: DataSettingsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDeleteClick = useCallback(() => {
    if (showDeleteConfirm) {
      onDeleteAllData()
      setShowDeleteConfirm(false)
    } else {
      setShowDeleteConfirm(true)
    }
  }, [showDeleteConfirm, onDeleteAllData])

  const formatDate = (date?: Date) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleString()
  }

  return (
    <SettingsSection
      title="Data & Privacy"
      icon="🔐"
      description="Manage your data and sync settings"
    >
      <SettingsRow
        label="Cloud Backup"
        description="Enable automatic cloud backup (coming soon)"
      >
        <SettingsToggle
          checked={settings.enableCloudBackup}
          onChange={(checked) => onUpdate({ enableCloudBackup: checked })}
          disabled // Disabled until cloud feature is implemented
        />
      </SettingsRow>

      <SettingsRow
        label="Auto Sync"
        description="Automatically sync changes"
      >
        <SettingsToggle
          checked={settings.autoSync}
          onChange={(checked) => onUpdate({ autoSync: checked })}
          disabled // Disabled until cloud feature is implemented
        />
      </SettingsRow>

      {settings.lastSyncDate && (
        <SettingsRow label="Last Sync" description={formatDate(settings.lastSyncDate)}>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {formatDate(settings.lastSyncDate)}
          </span>
        </SettingsRow>
      )}

      {/* Export/Import Actions */}
      <div className="p-4 space-y-3">
        <button
          onClick={onExportData}
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-slate-100 dark:bg-[#232948]',
            'text-slate-700 dark:text-slate-300',
            'font-medium',
            'hover:bg-slate-200 dark:hover:bg-[#2a3158]',
            'transition-colors',
            'flex items-center justify-center gap-2'
          )}
        >
          <span>📤</span>
          <span>Export All Data</span>
        </button>

        <button
          onClick={onImportData}
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-slate-100 dark:bg-[#232948]',
            'text-slate-700 dark:text-slate-300',
            'font-medium',
            'hover:bg-slate-200 dark:hover:bg-[#2a3158]',
            'transition-colors',
            'flex items-center justify-center gap-2'
          )}
        >
          <span>📥</span>
          <span>Import Data</span>
        </button>

        <button
          onClick={handleDeleteClick}
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'font-medium',
            'transition-colors',
            'flex items-center justify-center gap-2',
            showDeleteConfirm
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30'
          )}
        >
          <span>🗑️</span>
          <span>
            {showDeleteConfirm ? 'Tap again to confirm deletion' : 'Delete All Data'}
          </span>
        </button>

        {showDeleteConfirm && (
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="w-full px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Cancel
          </button>
        )}
      </div>
    </SettingsSection>
  )
}
