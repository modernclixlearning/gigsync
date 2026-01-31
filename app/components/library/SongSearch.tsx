import { Search, X } from 'lucide-react'
import { cn } from '~/lib/utils'

interface SongSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SongSearch({ value, onChange, placeholder = 'Search...' }: SongSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-10 pr-10 py-3 rounded-xl',
          'bg-white dark:bg-[#1a1f36]',
          'border border-slate-200 dark:border-slate-700',
          'text-slate-900 dark:text-white',
          'placeholder:text-slate-400 dark:placeholder:text-slate-500',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
          'transition-all'
        )}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
