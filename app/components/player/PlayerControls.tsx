import { useState } from 'react'
import {
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Pencil,
  RotateCcw,
  Minus,
  Plus,
  ScrollText,
  Volume2,
  VolumeX
} from 'lucide-react'
import { cn } from '~/lib/utils'
import type { PlayerOverrideKey, PlayerOverrides, BeatHighlightMode } from '~/types/song'
import {
  SettingsRow,
  SettingsStepper,
  SettingsColorField,
  SaveTierButtons,
  type SaveTier,
} from '~/components/profile/SettingsSection'

// contentWidth (px) is the width of the reading column — smaller width means
// bigger side margins. The "Márgenes" control below displays and steps the
// inverse of that value so "+" always means "more margin", matching its label.
const CONTENT_WIDTH_MIN = 480
const CONTENT_WIDTH_MAX = 1400
const CONTENT_WIDTH_STEP = 40

function contentWidthToMargin(contentWidth: number): number {
  return CONTENT_WIDTH_MIN + CONTENT_WIDTH_MAX - contentWidth
}
function marginToContentWidth(margin: number): number {
  return CONTENT_WIDTH_MIN + CONTENT_WIDTH_MAX - margin
}

interface PlayerControlsProps {
  isPlaying: boolean
  onPlayPause: () => void | Promise<void>
  autoScrollEnabled: boolean
  onToggleAutoScroll: () => void
  autoScrollSpeed: number
  onAutoScrollSpeedChange: (speed: number) => void
  showChords: boolean
  onToggleChords: () => void
  isEditMode: boolean
  onToggleEditMode: () => void
  fontSize: number
  onFontSizeChange: (size: number) => void
  linesPerBlock: number
  onLinesPerBlockChange: (lines: number) => void
  contentWidth: number
  onContentWidthChange: (width: number) => void
  transpose: number
  onTranspose: (semitones: number) => void
  onResetTranspose: () => void
  /** Target key name for the current transpose (e.g. "D#" or "Eb"), already spelled per transposePreferFlats. */
  transposeDisplay: string
  /** Current enharmonic spelling for the transpose target — only meaningful when isTransposeSpellingFlexible. */
  transposePreferFlats: boolean
  /** Whether the current target pitch has both a sharp and a flat name (natural notes don't). */
  isTransposeSpellingFlexible: boolean
  onToggleTransposeSpelling: () => void
  metronomeSoundEnabled: boolean
  onToggleMetronomeSound: () => void
  smartScrollContextWindow: number
  onSmartScrollContextWindowChange: (value: number) => void
  smartScrollSmoothness: number
  onSmartScrollSmoothnessChange: (value: number) => void
  showBeatIndicatorDebug: boolean
  onToggleBeatIndicatorDebug: () => void
  onSaveControlAsDefault: (key: PlayerOverrideKey, value: number | string) => void
  onSaveControlForSong: (key: PlayerOverrideKey, value: number | string) => void
  onSaveControlForSetlist: (key: PlayerOverrideKey, value: number | string) => void
  /** For rows that bundle several override keys behind one save button (e.g. beat highlight mode + its colors). */
  onSaveControlsAsDefault: (values: Partial<PlayerOverrides>) => void
  onSaveControlsForSong: (values: Partial<PlayerOverrides>) => void
  onSaveControlsForSetlist: (values: Partial<PlayerOverrides>) => void
  /** Only true when the player is opened from within a setlist. */
  canSaveForSetlist: boolean
  chordFontSize: number
  onChordFontSizeChange: (size: number) => void
  beatHighlightMode: BeatHighlightMode
  onBeatHighlightModeChange: (mode: BeatHighlightMode) => void
  beatHighlightTextColor: string
  onBeatHighlightTextColorChange: (color: string) => void
  beatHighlightBgColor: string
  onBeatHighlightBgColorChange: (color: string) => void
  /** null = theme default (light/dark), not yet overridden. */
  backgroundColor: string | null
  onBackgroundColorChange: (color: string | null) => void
  /** null = theme default (light/dark), not yet overridden. */
  lyricsTextColor: string | null
  onLyricsTextColorChange: (color: string | null) => void
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
  isEditMode,
  onToggleEditMode,
  fontSize,
  onFontSizeChange,
  linesPerBlock,
  onLinesPerBlockChange,
  contentWidth,
  onContentWidthChange,
  transpose,
  onTranspose,
  onResetTranspose,
  transposeDisplay,
  transposePreferFlats,
  isTransposeSpellingFlexible,
  onToggleTransposeSpelling,
  metronomeSoundEnabled,
  onToggleMetronomeSound,
  smartScrollContextWindow,
  onSmartScrollContextWindowChange,
  smartScrollSmoothness,
  onSmartScrollSmoothnessChange,
  showBeatIndicatorDebug,
  onToggleBeatIndicatorDebug,
  onSaveControlAsDefault,
  onSaveControlForSong,
  onSaveControlForSetlist,
  onSaveControlsAsDefault,
  onSaveControlsForSong,
  onSaveControlsForSetlist,
  canSaveForSetlist,
  chordFontSize,
  onChordFontSizeChange,
  beatHighlightMode,
  onBeatHighlightModeChange,
  beatHighlightTextColor,
  onBeatHighlightTextColorChange,
  beatHighlightBgColor,
  onBeatHighlightBgColorChange,
  backgroundColor,
  onBackgroundColorChange,
  lyricsTextColor,
  onLyricsTextColorChange
}: PlayerControlsProps) {
  const [showSettings, setShowSettings] = useState(false)

  const saveHandlerFor = (key: PlayerOverrideKey, value: number | string) => (tier: SaveTier) => {
    if (tier === 'song') onSaveControlForSong(key, value)
    else if (tier === 'setlist') onSaveControlForSetlist(key, value)
    else onSaveControlAsDefault(key, value)
  }

  const saveHandlerForMultiple = (values: Partial<PlayerOverrides>) => (tier: SaveTier) => {
    if (tier === 'song') onSaveControlsForSong(values)
    else if (tier === 'setlist') onSaveControlsForSetlist(values)
    else onSaveControlsAsDefault(values)
  }

  return (
    <div className="sticky bottom-0 z-20 bg-white dark:bg-[#1a1f36] border-t border-slate-200 dark:border-slate-800 safe-area-pb">
      {/* Settings Panel */}
      {showSettings && (
        <div className="max-w-2xl mx-auto px-6 md:px-8 py-4 border-b border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          <SettingsRow label="Scroll Speed">
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <SettingsStepper
                value={autoScrollSpeed}
                min={0}
                max={100}
                step={10}
                onChange={onAutoScrollSpeedChange}
              />
              <SaveTierButtons
                onSave={saveHandlerFor('autoScrollSpeed', autoScrollSpeed)}
                canSaveForSetlist={canSaveForSetlist}
              />
            </div>
          </SettingsRow>

          <SettingsRow label="Font Size">
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <SettingsStepper
                value={fontSize}
                min={20}
                max={56}
                step={2}
                onChange={onFontSizeChange}
              />
              <SaveTierButtons
                onSave={saveHandlerFor('fontSize', fontSize)}
                canSaveForSetlist={canSaveForSetlist}
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Versos por línea"
            description="Varios versos cortos comparten la misma línea (rap); uno largo ocupa la línea entera (aria)."
          >
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <SettingsStepper
                value={linesPerBlock}
                min={1}
                max={4}
                onChange={onLinesPerBlockChange}
              />
              <SaveTierButtons
                onSave={saveHandlerFor('linesPerBlock', linesPerBlock)}
                canSaveForSetlist={canSaveForSetlist}
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Márgenes"
            description="Espacio a los costados de la letra. Mayor = más margen."
          >
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <SettingsStepper
                value={contentWidthToMargin(contentWidth)}
                min={CONTENT_WIDTH_MIN}
                max={CONTENT_WIDTH_MAX}
                step={CONTENT_WIDTH_STEP}
                onChange={(margin) => onContentWidthChange(marginToContentWidth(margin))}
              />
              <SaveTierButtons
                onSave={saveHandlerFor('contentWidth', contentWidth)}
                canSaveForSetlist={canSaveForSetlist}
              />
            </div>
          </SettingsRow>

          <SettingsRow label="Transpose">
            <div className="flex flex-col items-start gap-1 sm:items-end">
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
                    'w-14 text-center text-sm font-medium rounded-lg py-1',
                    transpose !== 0 && 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  )}
                >
                  {transposeDisplay}
                </button>
                <button
                  onClick={() => onTranspose(1)}
                  className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={onToggleTransposeSpelling}
                  disabled={!isTransposeSpellingFlexible}
                  title={isTransposeSpellingFlexible ? 'Cambiar entre sostenido y bemol' : 'Esta nota no tiene alteración alternativa'}
                  className={cn(
                    'px-2 py-1 rounded-lg text-sm font-medium disabled:opacity-30',
                    transposePreferFlats
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'bg-slate-100 dark:bg-slate-800'
                  )}
                >
                  {transposePreferFlats ? '♭' : '♯'}
                </button>
              </div>
              <SaveTierButtons
                onSave={saveHandlerFor('transpose', transpose)}
                canSaveForSetlist={canSaveForSetlist}
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Tamaño de acordes"
            description="Tamaño de las etiquetas de acorde flotando sobre la letra."
          >
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <SettingsStepper
                value={chordFontSize}
                min={12}
                max={80}
                step={2}
                onChange={onChordFontSizeChange}
              />
              <SaveTierButtons
                onSave={saveHandlerFor('chordFontSize', chordFontSize)}
                canSaveForSetlist={canSaveForSetlist}
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Resaltado del beat"
            description="Cómo se destaca la palabra que suena: cambiando el color de letra o el de fondo."
          >
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onBeatHighlightModeChange('text')}
                  className={cn(
                    'px-2 py-1 rounded-lg text-xs font-medium',
                    beatHighlightMode === 'text'
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  )}
                >
                  Letra
                </button>
                <button
                  type="button"
                  onClick={() => onBeatHighlightModeChange('background')}
                  className={cn(
                    'px-2 py-1 rounded-lg text-xs font-medium',
                    beatHighlightMode === 'background'
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  )}
                >
                  Fondo
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-0.5">
                  <SettingsColorField value={beatHighlightTextColor} onChange={onBeatHighlightTextColorChange} />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Letra</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <SettingsColorField value={beatHighlightBgColor} onChange={onBeatHighlightBgColorChange} />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Fondo</span>
                </div>
              </div>
              <SaveTierButtons
                onSave={saveHandlerForMultiple({
                  beatHighlightMode,
                  beatHighlightTextColor,
                  beatHighlightBgColor,
                })}
                canSaveForSetlist={canSaveForSetlist}
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Colores del display"
            description="Fondo de la pantalla y color de la letra. Por defecto siguen el tema claro/oscuro."
          >
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-0.5">
                  <SettingsColorField
                    value={backgroundColor ?? '#101322'}
                    onChange={onBackgroundColorChange}
                    onReset={backgroundColor !== null ? () => onBackgroundColorChange(null) : undefined}
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Fondo</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <SettingsColorField
                    value={lyricsTextColor ?? '#ffffff'}
                    onChange={onLyricsTextColorChange}
                    onReset={lyricsTextColor !== null ? () => onLyricsTextColorChange(null) : undefined}
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Letra</span>
                </div>
              </div>
              <SaveTierButtons
                onSave={saveHandlerForMultiple({
                  backgroundColor: backgroundColor ?? '#101322',
                  lyricsTextColor: lyricsTextColor ?? '#ffffff',
                })}
                canSaveForSetlist={canSaveForSetlist}
              />
            </div>
          </SettingsRow>

          {/* Smart Scroll (Beta) */}
          <div className="pt-4 space-y-3">
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
