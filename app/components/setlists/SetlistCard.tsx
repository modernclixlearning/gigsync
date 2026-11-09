import { CalendarDays, ChevronRight, Clock, MapPin, Music2 } from 'lucide-react'
import { cn } from '~/lib/utils'
import { cardClass } from '~/components/layout'
import type { Setlist } from '~/types'

interface SetlistCardProps {
  setlist: Setlist
  onClick?: () => void
}

export function formatSetDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours} h ${minutes} min`
  return `${minutes} min`
}

export function SetlistCard({ setlist, onClick }: SetlistCardProps) {
  const formattedDate = setlist.date
    ? new Date(setlist.date).toLocaleDateString('es', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null
  const songCount = setlist.songIds.length

  return (
    <div
      onClick={onClick}
      className={cn(
        cardClass,
        'h-full p-4 cursor-pointer transition-colors',
        'hover:border-indigo-300 dark:hover:border-indigo-500/50'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-white truncate">
            {setlist.name}
          </h3>
          {setlist.venue && (
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{setlist.venue}</span>
            </p>
          )}
        </div>
        <ChevronRight className="w-5 h-5 shrink-0 text-slate-400" />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <Music2 className="w-3.5 h-3.5" />
          {songCount} {songCount === 1 ? 'canción' : 'canciones'}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {formatSetDuration(setlist.totalDuration)}
        </span>
        {formattedDate && (
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" />
            {formattedDate}
          </span>
        )}
      </div>
    </div>
  )
}
