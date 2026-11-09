import { cn } from '~/lib/utils'
import type { SongFilter } from '~/types'

interface SongFiltersProps {
  activeFilter: SongFilter
  onFilterChange: (filter: string) => void
}

const FILTERS: { id: SongFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'recent', label: 'Recientes' },
  { id: 'favorites', label: 'Favoritas' },
  { id: 'byKey', label: 'Por tono' },
  { id: 'byArtist', label: 'Por artista' }
]

export function SongFilters({ activeFilter, onFilterChange }: SongFiltersProps) {
  return (
    <div className="flex min-w-0 gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
      {FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onFilterChange(filter.id)}
          aria-pressed={activeFilter === filter.id}
          className={cn(
            'flex-shrink-0 h-9 px-4 rounded-full text-sm font-medium',
            'transition-colors whitespace-nowrap',
            activeFilter === filter.id
              ? 'bg-primary text-white'
              : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
