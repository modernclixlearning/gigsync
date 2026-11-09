import { Check, Clock, Music2 } from 'lucide-react'
import { cn } from '~/lib/utils'
import { cardClass } from '~/components/layout'
import type { Song } from '~/types'

interface SongCardProps {
  song: Song
  isSelected?: boolean
  onClick?: () => void
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function SongCard({ song, isSelected, onClick }: SongCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        cardClass,
        'flex items-center gap-3 p-3 h-full',
        'hover:border-indigo-300 dark:hover:border-indigo-500/50',
        'transition-colors cursor-pointer',
        isSelected && 'border-primary dark:border-indigo-400 ring-1 ring-primary dark:ring-indigo-400'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-11 h-11 shrink-0 rounded-xl',
          isSelected
            ? 'bg-primary text-white'
            : 'bg-indigo-50 dark:bg-indigo-500/10 text-primary dark:text-indigo-400'
        )}
      >
        {isSelected ? <Check className="w-5 h-5" /> : <Music2 className="w-5 h-5" />}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
          {song.title}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
          {song.artist || 'Sin artista'}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono font-semibold text-slate-700 dark:text-slate-200">
            {song.key}
          </span>
          <span className="tabular-nums">{song.bpm} BPM</span>
        </div>
        {song.duration > 0 && (
          <div className="flex items-center gap-1 tabular-nums">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(song.duration)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
