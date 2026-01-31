import { cn } from '~/lib/utils'
import type { UserStats } from '~/types/profile'

export interface ProfileStatsProps {
  stats: UserStats
  isLoading?: boolean
}

interface StatItemProps {
  icon: string
  label: string
  value: string | number
}

function StatItem({ icon, label, value }: StatItemProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center p-4',
        'bg-white dark:bg-[#111218]',
        'rounded-xl border border-slate-200 dark:border-[#3b3f54]'
      )}
    >
      <span className="text-2xl mb-2">{icon}</span>
      <span className="text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400 text-center">
        {label}
      </span>
    </div>
  )
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${remainingMinutes}m`
}

function formatDate(date?: Date): string {
  if (!date) return 'Never'
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return date.toLocaleDateString()
}

export function ProfileStats({ stats, isLoading }: ProfileStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-24 rounded-xl',
              'bg-slate-100 dark:bg-[#232948]',
              'animate-pulse'
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatItem icon="🎵" label="Songs" value={stats.totalSongs} />
        <StatItem icon="📋" label="Setlists" value={stats.totalSetlists} />
        <StatItem
          icon="⏱️"
          label="Practice Time"
          value={formatMinutes(stats.totalPracticeMinutes)}
        />
        <StatItem
          icon="📅"
          label="Last Session"
          value={formatDate(stats.lastSessionDate)}
        />
      </div>

      {/* Most Played Song */}
      {stats.mostPlayedSong && (
        <div
          className={cn(
            'p-4 rounded-xl',
            'bg-gradient-to-r from-primary/10 to-primary/5',
            'border border-primary/20'
          )}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-primary/70 dark:text-primary/80 font-semibold">
                Most Played
              </p>
              <p className="font-medium text-slate-900 dark:text-white">
                {stats.mostPlayedSong.title}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {stats.mostPlayedSong.playCount} plays
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
