/**
 * SectionPicker Component
 *
 * Tablet-friendly picker for choosing section types when adding new sections.
 */

import {
  ChevronsUp,
  Clapperboard,
  DoorOpen,
  FileText,
  Guitar,
  Mic2,
  Milestone,
  Music2,
  PauseCircle,
  Piano,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import type { SectionType } from '~/lib/chordpro'

interface SectionOption {
  type: SectionType
  label: string
  icon: LucideIcon
}

const SECTION_OPTIONS: SectionOption[] = [
  { type: 'verse', label: 'Verso', icon: FileText },
  { type: 'chorus', label: 'Estribillo', icon: Mic2 },
  { type: 'pre-chorus', label: 'Pre-Coro', icon: ChevronsUp },
  { type: 'bridge', label: 'Puente', icon: Milestone },
  { type: 'intro', label: 'Intro', icon: Clapperboard },
  { type: 'outro', label: 'Outro', icon: DoorOpen },
  { type: 'solo', label: 'Solo', icon: Guitar },
  { type: 'instrumental', label: 'Instrumental', icon: Music2 },
  { type: 'interlude', label: 'Interludio', icon: Piano },
  { type: 'break', label: 'Break', icon: PauseCircle },
]

interface SectionPickerProps {
  onSelect: (type: SectionType, name: string) => void
  onClose: () => void
}

export function SectionPicker({ onSelect, onClose }: SectionPickerProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700',
        'p-3 w-[min(88vw,300px)] select-none z-50'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Agregar sección
        </span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 max-[380px]:grid-cols-1 gap-1.5">
        {SECTION_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            title={opt.label}
            onClick={() => {
              onSelect(opt.type, opt.label)
              onClose()
            }}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              'min-h-[44px] min-w-0',
              'bg-slate-50 dark:bg-slate-700/50',
              'text-slate-700 dark:text-slate-200',
              'hover:bg-indigo-50 dark:hover:bg-indigo-900/30',
              'hover:text-indigo-700 dark:hover:text-indigo-300',
              'active:bg-indigo-100 dark:active:bg-indigo-900/50'
            )}
          >
            <opt.icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
