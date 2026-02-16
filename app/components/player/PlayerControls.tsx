import { useState } from 'react'
import {
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  Music,
  Eye,
  EyeOff,
  RotateCcw,
  Minus,
  Plus,
  ScrollText,
  Volume2,
  VolumeX
} from 'lucide-react'
import { cn } from '~/lib/utils'

interface PlayerControlsProps {
  isPlaying: boolean
  onPlayPause: () => void | Promise<void>
  autoScrollEnabled: boolean
  onToggleAutoScroll: () => void
  autoScrollSpeed: number
  onAutoScrollSpeedChange: (speed: number) => void
  showChords: boolean
  onToggleChords: () => void
  fontSize: number
  onFontSizeChange: (size: number) => void
  transpose: number
  onTranspose: (semitones: number) => void
  onResetTranspose: () => void
  metronomeSoundEnabled: boolean
  onToggleMetronomeSound: () => void
  smartScrollContextWindow: number
  onSmartScrollContextWindowChange: (value: number) => void
  smartScrollSmoothness: number
  onSmartScrollSmoothnessChange: (value: number) => void
  showBeatIndicatorDebug: boolean
  onToggleBeatIndicatorDebug: () => void
}

export function PlayerControls({
  isPlaying,
  onPlayPause,
  autoScrollEnabled,
  onToggleAutoScroll,
  autoScrollSpeed,
  onAutoScrollSpeedChange,
  showChords,
  onToggleChords,
  fontSize,
  onFontSizeChange,
  transpose,
  onTranspose,
  onResetTranspose,
  metronomeSoundEnabled,
  onToggleMetronomeSound,
  smartScrollContextWindow,
  onSmartScrollContextWindowChange,
  smartScrollSmoothness,
  onSmartScrollSmoothnessChange,
  showBeatIndicatorDebug,
  onToggleBeatIndicatorDebug
}: PlayerControlsProps) {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="sticky bottom-0 bg-white dark:bg-[#1a1f36] border-t border-slate-200 dark:border-slate-800 safe-area-pb">
      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-4">
          {/* Auto-scroll Speed */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Scroll Speed
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onAutoScrollSpeedChange(autoScrollSpeed - 10)}
                disabled={autoScrollSpeed <= 0}
                className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center text-sm font-medium">
                {autoScrollSpeed}
              </span>
              <button
                onClick={() => onAutoScrollSpeedChange(autoScrollSpeed + 10)}
                disabled={autoScrollSpeed >= 100}
                className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Font Size */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Font Size
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onFontSizeChange(fontSize - 2)}
                disabled={fontSize <= 12}
                className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center text-sm font-medium">
                {fontSize}
              </span>
              <button
                onClick={() => onFontSizeChange(fontSize + 2)}
                disabled={fontSize >= 32}
                className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Transpose */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Transpose
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onTranspose(-1)}
                className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={onResetTranspose}
                className={cn(
                  'w-12 text-center text-sm font-medium rounded-lg py-1',
                  transpose !== 0 && 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                )}
              >
                {transpose > 0 ? `+${transpose}` : transpose}
              </button>
              <button
                onClick={() => onTranspose(1)}
                className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Smart Scroll (Beta) */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Smart Scroll (Beta)
            </h4>

            {/* Context Window */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Context Window
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {smartScrollContextWindow}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  33% recomendado (línea actual en el tercio superior).
                </p>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={smartScrollContextWindow}
                onChange={(event) =>
                  onSmartScrollContextWindowChange(event.target.valueAsNumber)
                }
                className="w-32 accent-indigo-500"
              />
            </div>

            {/* Smoothness */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Smoothness
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {smartScrollSmoothness}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Valores altos = scroll más suave y lento.
                </p>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={smartScrollSmoothness}
                onChange={(event) =>
                  onSmartScrollSmoothnessChange(event.target.valueAsNumber)
                }
                className="w-32 accent-indigo-500"
              />
            </div>

            {/* Beat Indicator (debug) */}
            <label className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  Beat indicator (debug)
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Muestra beat y compás actual en un overlay.
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleBeatIndicatorDebug}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  showBeatIndicatorDebug
                    ? 'bg-indigo-500'
                    : 'bg-slate-300 dark:bg-slate-700'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                    showBeatIndicatorDebug ? 'translate-x-5' : 'translate-x-1'
                  )}
                />
              </button>
            </label>
          </div>
        </div>
      )}

      {/* Main Controls */}
      <div className="flex items-center justify-between px-4 py-3">
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
            onClick={() => setShowSettings(!showSettings)}
            aria-label={showSettings ? 'Hide settings' : 'Show settings'}
            className={cn(
              'p-3 rounded-xl transition-colors',
              showSettings
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            )}
          >
            {showSettings ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
