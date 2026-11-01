import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import { cn } from '~/lib/utils'
import type { PlayerOverrideKey, PlayerOverrides, BeatHighlightMode, SongTextAlign } from '~/types/song'
import type { AppSettings } from '~/types/profile'
import {
  SettingsRow,
  SettingsStepper,
  SettingsColorField,
  SettingsSlider,
  SettingsToggle,
  SaveTierButtons,
  type SaveTier,
} from '~/components/profile/SettingsSection'
import { PanelSection } from '~/components/player/PlayerSoundSettings'

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

const TEXT_ALIGNS: { value: SongTextAlign; label: string; Icon: typeof AlignLeft }[] = [
  { value: 'left', label: 'Alinear a la izquierda', Icon: AlignLeft },
  { value: 'center', label: 'Centrar', Icon: AlignCenter },
  { value: 'right', label: 'Alinear a la derecha', Icon: AlignRight },
]

const THEMES: { value: AppSettings['theme']; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'auto', label: 'Auto' },
]

const HIGHLIGHT_MODES: { value: BeatHighlightMode; label: string }[] = [
  { value: 'text', label: 'Color' },
  { value: 'background', label: 'Fondo' },
]

/** One "Letra: [Color] [Fondo]" line of the beat highlight row. */
function HighlightModeToggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: BeatHighlightMode
  onChange: (mode: BeatHighlightMode) => void
}) {
  return (
    <div role="group" aria-label={`Resaltado de ${label.toLowerCase()}`} className="flex items-center gap-1">
      <span className="w-14 text-[10px] text-slate-400 dark:text-slate-500">{label}</span>
      {HIGHLIGHT_MODES.map((mode) => (
        <button
          key={mode.value}
          type="button"
          aria-pressed={value === mode.value}
          onClick={() => onChange(mode.value)}
          className={cn(
            'px-2 py-1 rounded-lg text-xs font-medium',
            value === mode.value
              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  )
}

export interface PlayerAdjustmentsProps {
  autoScrollSpeed: number
  onAutoScrollSpeedChange: (speed: number) => void
  fontSize: number
  onFontSizeChange: (size: number) => void
  linesPerBlock: number
  onLinesPerBlockChange: (lines: number) => void
  contentWidth: number
  onContentWidthChange: (width: number) => void
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
  /** 0–100, 100 = original glow. */
  beatHighlightGlowIntensity: number
  onBeatHighlightGlowIntensityChange: (intensity: number) => void
  /** null = same as the highlight text color. */
  beatHighlightGlowColor: string | null
  onBeatHighlightGlowColorChange: (color: string | null) => void
  /** Already resolved: falls back to beatHighlightMode when not set. */
  chordHighlightMode: BeatHighlightMode
  onChordHighlightModeChange: (mode: BeatHighlightMode) => void
  /** null = theme default. */
  chordTextColor: string | null
  onChordTextColorChange: (color: string | null) => void
  /** null = no background. */
  chordBgColor: string | null
  onChordBgColorChange: (color: string | null) => void
  /** null = theme default (light/dark), not yet overridden. */
  backgroundColor: string | null
  onBackgroundColorChange: (color: string | null) => void
  /** null = theme default (light/dark), not yet overridden. */
  lyricsTextColor: string | null
  onLyricsTextColorChange: (color: string | null) => void
  textAlign: SongTextAlign
  onTextAlignChange: (align: SongTextAlign) => void
  /** App theme (light/dark), shown with the display colors when given. */
  theme?: AppSettings['theme']
  onThemeChange?: (theme: AppSettings['theme']) => void
}

/**
 * The «Vista» tab of the player panel: how the song reads on screen — lyrics,
 * chords, the beat highlight, colors and theme, and how it scrolls. Every
 * change is visible on the song while it is being tweaked.
 */
export function PlayerAdjustments({
  autoScrollSpeed,
  onAutoScrollSpeedChange,
  fontSize,
  onFontSizeChange,
  linesPerBlock,
  onLinesPerBlockChange,
  contentWidth,
  onContentWidthChange,
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
  beatHighlightGlowIntensity,
  onBeatHighlightGlowIntensityChange,
  beatHighlightGlowColor,
  onBeatHighlightGlowColorChange,
  chordHighlightMode,
  onChordHighlightModeChange,
  chordTextColor,
  onChordTextColorChange,
  chordBgColor,
  onChordBgColorChange,
  backgroundColor,
  onBackgroundColorChange,
  lyricsTextColor,
  onLyricsTextColorChange,
  textAlign,
  onTextAlignChange,
  theme,
  onThemeChange
}: PlayerAdjustmentsProps) {
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
    <div>
      <PanelSection title="Letra">
        <SettingsRow label="Tamaño de letra">
          <div className="flex flex-col items-start gap-1 @md:items-end">
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
          <div className="flex flex-col items-start gap-1 @md:items-end">
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
          <div className="flex flex-col items-start gap-1 @md:items-end">
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

        <SettingsRow
          label="Alineación"
          description="De toda la canción: letra, instrumentales y líneas de acordes."
        >
          <div className="flex flex-col items-start gap-1 @md:items-end">
            <div role="group" aria-label="Alineación" className="flex items-center gap-1">
              {TEXT_ALIGNS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-label={label}
                  aria-pressed={textAlign === value}
                  title={label}
                  onClick={() => onTextAlignChange(value)}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    textAlign === value
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
            <SaveTierButtons
              onSave={saveHandlerFor('textAlign', textAlign)}
              canSaveForSetlist={canSaveForSetlist}
            />
          </div>
        </SettingsRow>
      </PanelSection>

      <PanelSection title="Acordes">
        <SettingsRow
          label="Tamaño de acordes"
          description="Tamaño de las etiquetas de acorde flotando sobre la letra."
        >
          <div className="flex flex-col items-start gap-1 @md:items-end">
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
          label="Colores de acordes"
          description="Color y fondo de los acordes. Por defecto: celeste sobre la letra y el color de cada sección en los instrumentales, sin fondo."
        >
          <div className="flex flex-col items-start gap-2 @md:items-end">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-0.5">
                <SettingsColorField
                  value={chordTextColor ?? '#38bdf8'}
                  onChange={onChordTextColorChange}
                  onReset={chordTextColor !== null ? () => onChordTextColorChange(null) : undefined}
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Letra</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <SettingsColorField
                  value={chordBgColor ?? '#1e293b'}
                  onChange={onChordBgColorChange}
                  onReset={chordBgColor !== null ? () => onChordBgColorChange(null) : undefined}
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Fondo</span>
              </div>
            </div>
            <SaveTierButtons
              onSave={saveHandlerForMultiple({
                chordTextColor: chordTextColor ?? undefined,
                chordBgColor: chordBgColor ?? undefined,
              })}
              canSaveForSetlist={canSaveForSetlist}
            />
          </div>
        </SettingsRow>
      </PanelSection>

      <PanelSection title="Resaltado">
        <SettingsRow
          label="Resaltado del beat"
          description="Cómo se destaca lo que suena, por separado para la letra y para los acordes: con color (y sombra, que se puede suavizar o cambiar de color para ganar contraste) o con un fondo."
        >
          <div className="flex flex-col items-start gap-2 @md:items-end">
            <HighlightModeToggle label="Letra" value={beatHighlightMode} onChange={onBeatHighlightModeChange} />
            <HighlightModeToggle label="Acordes" value={chordHighlightMode} onChange={onChordHighlightModeChange} />
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-0.5">
                <SettingsColorField value={beatHighlightTextColor} onChange={onBeatHighlightTextColorChange} />
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Letra</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <SettingsColorField value={beatHighlightBgColor} onChange={onBeatHighlightBgColorChange} />
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Fondo</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <SettingsColorField
                  value={beatHighlightGlowColor ?? beatHighlightTextColor}
                  onChange={onBeatHighlightGlowColorChange}
                  onReset={beatHighlightGlowColor !== null ? () => onBeatHighlightGlowColorChange(null) : undefined}
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Sombra</span>
              </div>
            </div>
            <div className="flex flex-col items-start gap-0.5 @md:items-end">
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Intensidad de la sombra (modo Color)
              </span>
              <SettingsSlider
                value={beatHighlightGlowIntensity}
                min={0}
                max={100}
                step={5}
                onChange={onBeatHighlightGlowIntensityChange}
                suffix="%"
              />
            </div>
            <SaveTierButtons
              onSave={saveHandlerForMultiple({
                beatHighlightMode,
                beatHighlightTextColor,
                beatHighlightBgColor,
                beatHighlightGlowIntensity,
                beatHighlightGlowColor: beatHighlightGlowColor ?? beatHighlightTextColor,
                chordHighlightMode,
              })}
              canSaveForSetlist={canSaveForSetlist}
            />
          </div>
        </SettingsRow>
      </PanelSection>

      <PanelSection title="Pantalla">
        <SettingsRow
          label="Colores del display"
          description="Fondo de la pantalla y color de la letra. Por defecto siguen el tema claro/oscuro."
        >
          <div className="flex flex-col items-start gap-2 @md:items-end">
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

        {theme && onThemeChange && (
          <SettingsRow label="Tema" description="Claro, oscuro o el del sistema. Es de toda la app.">
            <div role="group" aria-label="Tema" className="flex items-center gap-1">
              {THEMES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={theme === option.value}
                  onClick={() => onThemeChange(option.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium',
                    theme === option.value
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </SettingsRow>
        )}
      </PanelSection>

      <PanelSection title="Desplazamiento">
        <SettingsRow
          label="Posición de la línea"
          description="Dónde queda la línea que suena: 0% arriba, 50% centrada (recomendado), 100% abajo."
        >
          <SettingsSlider
            value={smartScrollContextWindow}
            min={0}
            max={100}
            onChange={onSmartScrollContextWindowChange}
            suffix="%"
            ariaLabel="Posición de la línea"
          />
        </SettingsRow>

        <SettingsRow label="Suavidad" description="Más alto = scroll más suave y lento.">
          <SettingsSlider
            value={smartScrollSmoothness}
            min={0}
            max={100}
            onChange={onSmartScrollSmoothnessChange}
            ariaLabel="Suavidad del scroll"
          />
        </SettingsRow>

        <SettingsRow
          label="Velocidad del scroll"
          description="Para las canciones sin compases, donde el scroll no puede seguir el tempo."
        >
          <div className="flex flex-col items-start gap-1 @md:items-end">
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

        <SettingsRow
          label="Indicador de beat (debug)"
          description="Muestra el beat y el compás actual sobre la canción."
        >
          <SettingsToggle
            checked={showBeatIndicatorDebug}
            onChange={onToggleBeatIndicatorDebug}
            ariaLabel="Indicador de beat (debug)"
          />
        </SettingsRow>
      </PanelSection>
    </div>
  )
}
