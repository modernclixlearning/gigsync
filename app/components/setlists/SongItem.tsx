import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '~/lib/utils'
import type { Song } from '~/types'

interface SongItemProps {
  song: Song
  index: number
  onRemove: () => void
  onReorder: (fromIndex: number, toIndex: number) => void
}

export function SongItem({ song, index, onRemove, onReorder }: SongItemProps) {
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
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl',
        'border border-slate-200 dark:border-[#3b3f54]',
        'bg-white dark:bg-[#111218]',
        isDragging && 'shadow-lg'
      )}
    >
      {/* Drag Handle */}
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
      >
        <span className="material-symbols-outlined">drag_indicator</span>
      </span>

      {/* Index */}
      <span className="w-6 text-center text-sm font-medium text-slate-400">
        {index + 1}
      </span>

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-slate-900 dark:text-white truncate">
          {song.title}
        </h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
          {song.artist}
        </p>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span className="hidden sm:inline">{song.bpm} BPM</span>
        <span className="hidden sm:inline">{song.key}</span>
        <span>{formatDuration(song.duration)}</span>
      </div>

      {/* Remove Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
      >
        <span className="material-symbols-outlined text-xl">close</span>
      </button>
    </div>
  )
}
