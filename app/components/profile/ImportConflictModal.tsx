import { useState } from 'react'
import type { ConflictResolution, SongConflict, SongContentField } from '~/lib/importMerge'
import { cn } from '~/lib/utils'

export interface ImportConflictModalProps {
  conflicts: SongConflict[]
  onCancel: () => void
  onApply: (resolutions: Record<string, ConflictResolution>) => void
}

const FIELD_LABELS: Record<SongContentField, string> = {
  title: 'Título',
  artist: 'Artista',
  bpm: 'BPM',
  key: 'Tonalidad',
  timeSignature: 'Compás',
  duration: 'Duración',
  lyrics: 'Letra/acordes',
  tags: 'Tags',
  notes: 'Notas',
  playerOverrides: 'Ajustes del player',
}

export function ImportConflictModal({ conflicts, onCancel, onApply }: ImportConflictModalProps) {
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>(() =>
    Object.fromEntries(conflicts.map((conflict) => [conflict.id, 'keep-existing' as ConflictResolution]))
  )

  const setAll = (resolution: ConflictResolution) => {
    setResolutions(Object.fromEntries(conflicts.map((conflict) => [conflict.id, resolution])))
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
    >
      <div className="w-full sm:max-w-lg sm:mx-4 max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#111218] border border-slate-200 dark:border-[#3b3f54]">
        <div className="p-4 border-b border-slate-100 dark:border-[#3b3f54]">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {conflicts.length} canción{conflicts.length === 1 ? '' : 'es'} en conflicto
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ya tenés una versión distinta de estas canciones. Elegí cuál conservar.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setAll('keep-existing')}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-[#232948] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2a3158] transition-colors"
            >
              Conservar la mía en todas
            </button>
            <button
              onClick={() => setAll('use-imported')}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-[#232948] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2a3158] transition-colors"
            >
              Usar la importada en todas
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#3b3f54]">
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="p-4 space-y-2">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {conflict.existing.title} — {conflict.existing.artist}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Difiere en: {conflict.differingFields.map((field) => FIELD_LABELS[field]).join(', ')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setResolutions((prev) => ({ ...prev, [conflict.id]: 'keep-existing' }))
                  }
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    resolutions[conflict.id] === 'keep-existing'
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-[#232948] text-slate-700 dark:text-slate-300'
                  )}
                >
                  Mi versión
                </button>
                <button
                  onClick={() =>
                    setResolutions((prev) => ({ ...prev, [conflict.id]: 'use-imported' }))
                  }
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    resolutions[conflict.id] === 'use-imported'
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-[#232948] text-slate-700 dark:text-slate-300'
                  )}
                >
                  Importada
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-[#3b3f54] flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#232948] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onApply(resolutions)}
            className="flex-1 px-4 py-3 rounded-xl font-medium bg-primary text-white hover:opacity-90 transition-opacity"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}
