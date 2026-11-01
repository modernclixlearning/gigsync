import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '~/lib/utils'

/**
 * One tab per kind of thing: how the song is shown (view), what it sounds
 * like while playing (sound), and the song itself — its data, lyrics and
 * chords (edit; the id stays 'edit' so `?panel=edit` links keep working).
 */
export type PlayerPanelTab = 'view' | 'sound' | 'edit'

export const PLAYER_PANEL_TABS: { id: PlayerPanelTab; label: string }[] = [
  { id: 'view', label: 'Vista' },
  { id: 'sound', label: 'Sonido' },
  { id: 'edit', label: 'Canción' },
]

/** Width of the docked panel from `md:` up — the player reserves the same space on its right. */
export const PLAYER_SIDE_PANEL_WIDTH_CLASS = 'md:w-[400px]'
export const PLAYER_SIDE_PANEL_OFFSET_CLASS = 'md:pr-[400px]'
/** Height of the bottom sheet below `md:` — the player pads its bottom by the same amount. */
export const PLAYER_SIDE_PANEL_SHEET_OFFSET_CLASS = 'max-md:pb-[55vh]'

interface PlayerSidePanelProps {
  isOpen: boolean
  tab: PlayerPanelTab
  onTabChange: (tab: PlayerPanelTab) => void
  onClose: () => void
  /** Content per tab — only the active one is mounted. */
  content: Record<PlayerPanelTab, ReactNode>
}

/**
 * Side panel for the song player: docked on the right from `md:` up (the
 * song keeps the rest of the screen and reflows next to it), bottom sheet
 * on phones. Everything inside edits live state, so the song on screen
 * shows the result while you adjust it.
 */
export function PlayerSidePanel({ isOpen, tab, onTabChange, onClose, content }: PlayerSidePanelProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      // A dialog on top (e.g. the MIDI recording view) handles its own Escape.
      if (e.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <aside
      aria-label="Panel del reproductor"
      className={cn(
        'fixed z-40 flex flex-col',
        'bg-white dark:bg-[#1a1f36] text-slate-900 dark:text-white',
        'border-slate-200 dark:border-slate-800 shadow-2xl',
        // Phones: bottom sheet over the controls, song stays visible above it.
        'inset-x-0 bottom-0 h-[55vh] rounded-t-2xl border-t',
        // Tablet/desktop: docked to the right, full height.
        'md:inset-x-auto md:right-0 md:top-0 md:h-auto md:rounded-none md:border-t-0 md:border-l',
        PLAYER_SIDE_PANEL_WIDTH_CLASS
      )}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div role="tablist" className="flex flex-1 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60">
          {PLAYER_PANEL_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => onTabChange(id)}
              className={cn(
                'flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                tab === id
                  ? 'bg-white dark:bg-[#232948] text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Keyed by tab: each tab opens at its top, not at the last one's scroll. */}
      <div key={tab} role="tabpanel" className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {content[tab]}
      </div>
    </aside>
  )
}
