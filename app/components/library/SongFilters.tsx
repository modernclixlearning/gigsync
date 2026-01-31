import { cn } from '~/lib/utils'
import type { SongFilter } from '~/types'

interface SongFiltersProps {
  activeFilter: SongFilter
  onFilterChange: (filter: string) => void
}

const FILTERS: { id: SongFilter; label: string }[] = [
  { id: 'all', label: 'All Songs' },
  { id: 'recent', label: 'Recent' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'byKey', label: 'By Key' },
  { id: 'byArtist', label: 'By Artist' }
]

export function SongFilters({ activeFilter, onFilterChange }: SongFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {FILTERS.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={cn(
            'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium',
            'transition-all whitespace-nowrap',
            activeFilter === filter.id
              ? 'bg-indigo-500 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
