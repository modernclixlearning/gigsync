import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import { cn } from '~/lib/utils'
import { cardClass } from '~/components/layout'
import type { Song } from '~/types'

interface SongItemProps {
  song: Song
  index: number
  onRemove: () => void
  onReorder: (fromIndex: number, toIndex: number) => void
}

export function SongItem({ song, index, onRemove }: SongItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(cardClass, 'flex items-center gap-2 p-2 pr-1 rounded-xl', isDragging && 'shadow-lg')}
    >
      {/* Drag Handle */}
      <span
        {...attributes}
        {...listeners}
        aria-label={`Reordenar ${song.title}`}
        className="flex h-11 w-8 shrink-0 touch-none items-center justify-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      >
        <GripVertical className="w-5 h-5" />
      </span>

      {/* Index */}
      <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-slate-400">
        {index + 1}
      </span>

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-slate-900 dark:text-white truncate">
          {song.title}
        </h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
          {song.artist || 'Sin artista'}
        </p>
      </div>

      {/* Metadata */}
      <div className="flex shrink-0 items-center gap-3 text-sm tabular-nums text-slate-500 dark:text-slate-400">
        <span className="hidden sm:inline rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
          {song.key}
        </span>
        <span className="hidden sm:inline">{song.bpm} BPM</span>
        <span>{formatDuration(song.duration)}</span>
      </div>

      {/* Remove Button */}
      <button
        type="button"
        aria-label={`Quitar ${song.title} del setlist`}
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}
