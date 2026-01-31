interface SetlistStatsProps {
  songCount: number
  totalDuration: number
  venue?: string
  date?: Date
}

export function SetlistStats({ songCount, totalDuration, venue, date }: SetlistStatsProps) {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes} min`
  }

  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : null

  return (
    <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3 rounded-xl bg-white dark:bg-[#111218] border border-slate-200 dark:border-[#3b3f54]">
          <p className="text-2xl font-bold text-primary">{songCount}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Songs</p>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-[#111218] border border-slate-200 dark:border-[#3b3f54]">
          <p className="text-2xl font-bold text-primary">{formatDuration(totalDuration)}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Duration</p>
        </div>
        {venue && (
          <div className="p-3 rounded-xl bg-white dark:bg-[#111218] border border-slate-200 dark:border-[#3b3f54]">
            <p className="text-lg font-medium text-slate-900 dark:text-white truncate">{venue}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Venue</p>
          </div>
        )}
        {formattedDate && (
          <div className="p-3 rounded-xl bg-white dark:bg-[#111218] border border-slate-200 dark:border-[#3b3f54]">
            <p className="text-lg font-medium text-slate-900 dark:text-white">{formattedDate}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Date</p>
          </div>
        )}
      </div>
    </div>
  )
}
