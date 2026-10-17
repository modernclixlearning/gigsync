import {
  Play,
  Pause,
  Eye,
  EyeOff,
  Pencil,
  RotateCcw,
  ScrollText,
  SlidersHorizontal,
  Volume2,
  VolumeX
} from 'lucide-react'
import { cn } from '~/lib/utils'

interface PlayerControlsProps {
  isPlaying: boolean
  onPlayPause: () => void | Promise<void>
  autoScrollEnabled: boolean
  onToggleAutoScroll: () => void
  showChords: boolean
  onToggleChords: () => void
  isEditMode: boolean
  onToggleEditMode: () => void
  transpose: number
  onResetTranspose: () => void
  metronomeSoundEnabled: boolean
  onToggleMetronomeSound: () => void
  /** Whether the side panel (Ajustes / Editar / Config) is open. */
  isSettingsOpen: boolean
  onToggleSettings: () => void
}

export function PlayerControls({
  isPlaying,
  onPlayPause,
  autoScrollEnabled,
  onToggleAutoScroll,
  showChords,
  onToggleChords,
  isEditMode,
  onToggleEditMode,
  transpose,
  onResetTranspose,
  metronomeSoundEnabled,
  onToggleMetronomeSound,
  isSettingsOpen,
  onToggleSettings
}: PlayerControlsProps) {
  return (
    <div className="sticky bottom-0 z-20 bg-white dark:bg-[#1a1f36] border-t border-slate-200 dark:border-slate-800 safe-area-pb">
      {/* Main Controls */}
      <div className="mx-auto flex items-center justify-between px-6 md:px-8 py-3">
        {/* Left Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleChords}
            className={cn(
              'p-3 rounded-xl transition-colors',
              showChords
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            )}
            title={showChords ? 'Hide chords' : 'Show chords'}
          >
            {showChords ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>

          {showChords && !isPlaying && (
            <button
              onClick={onToggleEditMode}
              className={cn(
                'p-3 rounded-xl transition-colors',
                isEditMode
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              )}
              title={isEditMode ? 'Salir de edición' : 'Editar acordes'}
              aria-label={isEditMode ? 'Salir de edición' : 'Editar acordes'}
            >
              <Pencil className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onToggleAutoScroll}
            className={cn(
              'p-3 rounded-xl transition-colors flex items-center gap-1.5',
              autoScrollEnabled
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            )}
            title={autoScrollEnabled ? 'Stop auto-scroll' : 'Start auto-scroll'}
          >
            <ScrollText className="w-5 h-5" />
            <span className="text-xs font-medium hidden sm:inline">
              {autoScrollEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {autoScrollEnabled && (
            <button
              onClick={onToggleMetronomeSound}
              className={cn(
                'p-3 rounded-xl transition-colors',
                metronomeSoundEnabled
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              )}
              title={metronomeSoundEnabled ? 'Mute metronome' : 'Enable metronome sound'}
            >
              {metronomeSoundEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {/* Center - Play/Pause */}
        <button
          onClick={async () => {
            await onPlayPause()
          }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className={cn(
            'p-4 rounded-full transition-colors',
            isPlaying
              ? 'bg-indigo-500 text-white'
              : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
          )}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </button>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {transpose !== 0 && (
            <button
              onClick={onResetTranspose}
              className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
              title="Reset transpose"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onToggleSettings}
            aria-label={isSettingsOpen ? 'Hide settings' : 'Show settings'}
            aria-pressed={isSettingsOpen}
            title={isSettingsOpen ? 'Cerrar panel' : 'Ajustes, edición y config'}
            className={cn(
              'p-3 rounded-xl transition-colors',
              isSettingsOpen
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            )}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
