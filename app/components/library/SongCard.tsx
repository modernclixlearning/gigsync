import { Music2, Clock, Hash } from 'lucide-react'
import { cn } from '~/lib/utils'
import type { Song } from '~/types'

interface SongCardProps {
  song: Song
  isSelected?: boolean
  onClick?: () => void
}

export function SongCard({ song, isSelected, onClick }: SongCardProps) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl',
        'bg-white dark:bg-[#1a1f36]',
        'border border-transparent',
        'hover:border-slate-200 dark:hover:border-slate-700',
        'transition-all cursor-pointer',
        isSelected && 'border-indigo-500 dark:border-indigo-500 ring-1 ring-indigo-500'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex items-center justify-center w-12 h-12 rounded-xl',
          'bg-indigo-100 dark:bg-indigo-900/30',
          'text-indigo-500'
        )}
      >
        <Music2 className="w-6 h-6" />
      </div>

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
          {song.title}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
          {song.artist}
        </p>
      </div>

      {/* Meta Info */}
      <div className="flex flex-col items-end gap-1 text-xs text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-1">
          <span className="font-medium">{song.key}</span>
          <span>•</span>
          <span>{song.bpm} BPM</span>
        </div>
        {song.duration > 0 && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(song.duration)}</span>
          </div>
        )}
        {song.tags.length > 0 && (
          <div className="flex items-center gap-1">
            <Hash className="w-3 h-3" />
            <span>{song.tags.length}</span>
          </div>
        )}
      </div>
    </div>
  )
}
