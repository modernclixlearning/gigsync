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
  ScrollText
} from 'lucide-react'
import { cn } from '~/lib/utils'

interface PlayerControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
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
  onResetTranspose
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
              'p-3 rounded-xl transition-colors',
              autoScrollEnabled
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            )}
            title={autoScrollEnabled ? 'Stop auto-scroll' : 'Start auto-scroll'}
          >
            <ScrollText className="w-5 h-5" />
          </button>
        </div>

        {/* Center - Play/Pause */}
        <button
          onClick={onPlayPause}
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
