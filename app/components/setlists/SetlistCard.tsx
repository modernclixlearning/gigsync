import { cn } from '~/lib/utils'
import type { Setlist } from '~/types'

interface SetlistCardProps {
  setlist: Setlist
  onClick?: () => void
}

export function SetlistCard({ setlist, onClick }: SetlistCardProps) {
  const formattedDate = setlist.date
    ? new Date(setlist.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes} min`
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl border border-slate-200 dark:border-[#3b3f54]',
        'bg-white dark:bg-[#111218]',
        'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5',
        'transition-colors'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {setlist.name}
          </h3>
          {setlist.venue && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              📍 {setlist.venue}
            </p>
          )}
        </div>
        <span className="material-symbols-outlined text-slate-400">
          chevron_right
        </span>
      </div>

      <div className="flex gap-4 mt-3 text-sm text-slate-500 dark:text-slate-400">
        <span>{setlist.songIds.length} songs</span>
        <span>{formatDuration(setlist.totalDuration)}</span>
        {formattedDate && <span>{formattedDate}</span>}
      </div>
    </div>
  )
}
