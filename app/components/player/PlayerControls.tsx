import type { ReactNode } from 'react'
import {
  Play,
  Pause,
  Eye,
  EyeOff,
  Pencil,
  Piano,
  RotateCcw,
  ScrollText,
  SkipBack,
  SkipForward,
  Timer,
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
  /** Play the chords while the song runs (smart autoscroll only, like the metronome). */
  chordSoundEnabled?: boolean
  onToggleChordSound?: () => void
  /** Whether the side panel is open on Ajustes or Config (Editar has its own button in the header). */
  isSettingsOpen: boolean
  onToggleSettings: () => void
  /** Back to the top of the song (keeps playing if it was playing). */
  onRestart: () => void
  /** Count-in toggle: while on, every Play starts with the metronome count-in. */
  isCountInOn: boolean
  onToggleCountIn: () => void
  /** The count is running right now. */
  isCountingIn: boolean
  /** Only in a setlist with a song after this one. */
  onNextSong?: () => void
}

interface ControlButtonProps {
  onClick: () => void
  /** On/off controls: tinted when on. Leave undefined for plain actions. */
  active?: boolean
  /** Color of the "on" state — emerald marks autoscroll, the mode that drives the rest. */
  tone?: 'indigo' | 'emerald'
  title: string
  ariaLabel?: string
  /** Expose the on/off state to assistive tech. */
  pressed?: boolean
  className?: string
  children: ReactNode
}

/** Every button in the bar: same 44px target, same radius, same on/off colors. */
function ControlButton({ onClick, active, tone = 'indigo', title, ariaLabel, pressed, className, children }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      className={cn(
        'flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2.5 transition-colors',
        active
          ? tone === 'emerald'
            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
        className
      )}
    >
      {children}
    </button>
  )
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
  chordSoundEnabled = false,
  onToggleChordSound,
  isSettingsOpen,
  onToggleSettings,
  onRestart,
  isCountInOn,
  onToggleCountIn,
  isCountingIn,
  onNextSong
}: PlayerControlsProps) {
  return (
    <div className="sticky bottom-0 z-20 bg-white dark:bg-[#1a1f36] border-t border-slate-200 dark:border-slate-800 safe-area-pb">
      {/* Phones: transport on its own row, toggles below it.
          From sm: up: one row — toggles · transport · settings — with Play in the exact center. */}
      <div className="mx-auto grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-2 px-4 md:px-8 py-2.5 sm:grid-cols-[1fr_auto_1fr]">
        {/* Left: what you see and hear */}
        <div className="flex items-center gap-2">
          <ControlButton
            onClick={onToggleChords}
            active={showChords}
            title={showChords ? 'Ocultar acordes' : 'Mostrar acordes'}
          >
            {showChords ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </ControlButton>

          {showChords && !isPlaying && (
            <ControlButton
              onClick={onToggleEditMode}
              active={isEditMode}
              title={isEditMode ? 'Salir de edición' : 'Editar acordes'}
              ariaLabel={isEditMode ? 'Salir de edición' : 'Editar acordes'}
            >
              <Pencil className="w-5 h-5" />
            </ControlButton>
          )}

          <ControlButton
            onClick={onToggleAutoScroll}
            active={autoScrollEnabled}
            tone="emerald"
            title={autoScrollEnabled ? 'Detener autoscroll' : 'Activar autoscroll'}
          >
            <ScrollText className="w-5 h-5" />
            <span className="text-xs font-semibold hidden md:inline">
              {autoScrollEnabled ? 'ON' : 'OFF'}
            </span>
          </ControlButton>

          {autoScrollEnabled && (
            <ControlButton
              onClick={onToggleMetronomeSound}
              active={metronomeSoundEnabled}
              title={metronomeSoundEnabled ? 'Silenciar metrónomo' : 'Activar sonido del metrónomo'}
            >
              {metronomeSoundEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </ControlButton>
          )}

          {autoScrollEnabled && onToggleChordSound && (
            <ControlButton
              onClick={onToggleChordSound}
              active={chordSoundEnabled}
              ariaLabel="Escuchar acordes"
              pressed={chordSoundEnabled}
              title={chordSoundEnabled ? 'Silenciar acordes' : 'Escuchar los acordes al reproducir'}
            >
              <Piano className="w-5 h-5" />
            </ControlButton>
          )}
        </div>

        {/* Center - transport: restart · PLAY · count-in (· next song).
            Play sits in the middle column of its own grid so it stays centered
            whatever is on either side of it. */}
        <div className="order-first col-span-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:order-none sm:col-span-1">
          <div className="flex justify-end">
            <ControlButton onClick={onRestart} ariaLabel="Desde el inicio" title="Volver al inicio de la canción" className="rounded-full">
              <SkipBack className="w-5 h-5" />
            </ControlButton>
          </div>

          <button
            type="button"
            onClick={async () => {
              await onPlayPause()
            }}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full text-white transition-colors',
              'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30',
              isPlaying && 'ring-4 ring-indigo-200 dark:ring-indigo-500/30'
            )}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 ml-0.5 fill-current" />
            )}
          </button>

          <div className="flex justify-start gap-2">
            <button
              type="button"
              onClick={onToggleCountIn}
              aria-label="Precuenta"
              aria-pressed={isCountInOn}
              title={isCountInOn ? 'Precuenta activada: cada Play arranca con precuenta' : 'Activar precuenta en cada Play'}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
                isCountInOn
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                isCountingIn && 'animate-pulse'
              )}
            >
              <Timer className="w-5 h-5" />
            </button>

            {onNextSong && (
              <ControlButton
                onClick={onNextSong}
                ariaLabel="Siguiente canción"
                title="Pasar a la siguiente canción del setlist"
                className="rounded-full"
              >
                <SkipForward className="w-5 h-5" />
              </ControlButton>
            )}
          </div>
        </div>

        {/* Right: transpose reset + settings panel */}
        <div className="flex items-center justify-end gap-2">
          {transpose !== 0 && (
            <ControlButton onClick={onResetTranspose} active title="Restablecer transposición">
              <RotateCcw className="w-5 h-5" />
            </ControlButton>
          )}

          <ControlButton
            onClick={onToggleSettings}
            active={isSettingsOpen}
            ariaLabel={isSettingsOpen ? 'Cerrar ajustes' : 'Ajustes'}
            pressed={isSettingsOpen}
            title={isSettingsOpen ? 'Cerrar ajustes' : 'Ajustes de la vista y configuración'}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </ControlButton>
        </div>
      </div>
    </div>
  )
}
