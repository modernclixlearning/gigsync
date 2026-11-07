import { useCallback, useState, type ReactNode } from 'react'
import { db } from '~/lib/db'
import { cn } from '~/lib/utils'
import { parseGigsync, GIGSYNC_EXTENSION } from '~/lib/gigsyncFile'
import {
  planSongImport,
  planSetlistImport,
  resolveSongsToWrite,
  type ConflictResolution,
  type SongConflict,
} from '~/lib/importMerge'
import { ImportConflictModal } from '~/components/profile/ImportConflictModal'
import type { Song, Setlist } from '~/types/setlist'

interface PendingImportData {
  newSongs: Song[]
  newSetlists: Setlist[]
  profile: string | null
  settings: string | null
  stats: string | null
}

const RELOAD_DELAY_MS = 1400

export function summarizeImport(newSongsCount: number, newSetlistsCount: number, overwrittenCount: number): string {
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

async function applyNonConflictingImport(pending: PendingImportData): Promise<void> {
  if (pending.newSongs.length > 0) await db.songs.bulkAdd(pending.newSongs)
  if (pending.newSetlists.length > 0) await db.setlists.bulkAdd(pending.newSetlists)
  if (pending.profile) localStorage.setItem('gigsync_profile', pending.profile)
  if (pending.settings) localStorage.setItem('gigsync_settings', pending.settings)
  if (pending.stats) localStorage.setItem('gigsync_stats', pending.stats)
}

/**
 * Importing a .gigsync file (or an old backup .json): picks the file, merges it
 * with what's on the device and, when a song exists on both with different
 * content, asks which version to keep. `node` holds the dialog and the toast —
 * render it once in the page.
 */
export function useGigsyncImport(): { openPicker: () => void; node: ReactNode } {
  const [importConflicts, setImportConflicts] = useState<SongConflict[] | null>(null)
  const [pendingImport, setPendingImport] = useState<PendingImportData | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const importFile = useCallback(async (file: File) => {
    try {
      const parsed = parseGigsync(await file.text())
      const [existingSongs, existingSetlists] = await Promise.all([db.songs.toArray(), db.setlists.toArray()])
      const { newSongs, conflicts } = planSongImport(existingSongs, parsed.songs)
      const { newSetlists } = planSetlistImport(existingSetlists, parsed.setlists)
      const pending: PendingImportData = {
        newSongs,
        newSetlists,
        profile: parsed.profile,
        settings: parsed.settings,
        stats: parsed.stats,
      }
      if (conflicts.length === 0) {
        await applyNonConflictingImport(pending)
        setToast(summarizeImport(newSongs.length, newSetlists.length, 0))
        setTimeout(() => window.location.reload(), RELOAD_DELAY_MS)
        return
      }
      // Nothing is written until every conflict is resolved.
      setImportConflicts(conflicts)
      setPendingImport(pending)
    } catch (error) {
      console.error('Failed to import data:', error)
      alert('No se pudo importar: el archivo no es un fichero de GigSync válido.')
    }
  }, [])

  const openPicker = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = `${GIGSYNC_EXTENSION},.json,application/json`
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) void importFile(file)
    }
    input.click()
  }, [importFile])

  const handleApply = useCallback(
    async (resolutions: Record<string, ConflictResolution>) => {
      if (!importConflicts || !pendingImport) return
      await applyNonConflictingImport(pendingImport)
      const overwrite = resolveSongsToWrite(importConflicts, resolutions)
      if (overwrite.length > 0) await db.songs.bulkPut(overwrite)
      setToast(summarizeImport(pendingImport.newSongs.length, pendingImport.newSetlists.length, overwrite.length))
      setImportConflicts(null)
      setPendingImport(null)
      setTimeout(() => window.location.reload(), RELOAD_DELAY_MS)
    },
    [importConflicts, pendingImport],
  )

  const node = (
    <>
      {importConflicts && importConflicts.length > 0 && (
        <ImportConflictModal
          conflicts={importConflicts}
          onCancel={() => {
            setImportConflicts(null)
            setPendingImport(null)
          }}
          onApply={handleApply}
        />
      )}
      {toast && <ShareToast message={toast} />}
    </>
  )

  return { openPicker, node }
}

export function ShareToast({ message }: { message: string }) {
  return (
    <div
      role="status"
      className={cn(
        'fixed bottom-24 left-1/2 -translate-x-1/2 z-50',
        'px-4 py-3 rounded-xl shadow-lg',
        'bg-slate-900 dark:bg-white text-white dark:text-slate-900',
        'flex items-center gap-2 text-sm font-medium',
        'max-w-[calc(100%-2rem)]',
      )}
    >
      <span>✅</span>
      <span>{message}</span>
    </div>
  )
}
