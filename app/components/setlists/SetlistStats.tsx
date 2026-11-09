import { cn } from '~/lib/utils'
import { cardClass } from '~/components/layout'
import { formatSetDuration } from './SetlistCard'

interface SetlistStatsProps {
  songCount: number
  totalDuration: number
  venue?: string
  date?: Date
}

function Stat({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={cn(cardClass, 'min-w-0 p-3')}>
      <p
        className={cn(
          'truncate font-bold',
          accent ? 'text-2xl text-primary dark:text-indigo-400 tabular-nums' : 'text-base leading-8 text-slate-900 dark:text-white'
        )}
      >
        {value}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
    </div>
  )
}

export function SetlistStats({ songCount, totalDuration, venue, date }: SetlistStatsProps) {
  const formattedDate = date
    ? new Date(date).toLocaleDateString('es', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Stat label="Canciones" value={songCount} accent />
      <Stat label="Duración" value={formatSetDuration(totalDuration)} accent />
      {venue && <Stat label="Lugar" value={venue} />}
      {formattedDate && <Stat label="Fecha" value={formattedDate} />}
    </div>
  )
}
