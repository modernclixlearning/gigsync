import { useState } from 'react'
import { cn } from '~/lib/utils'
import type { CreateSetlistInput, Setlist } from '~/types'

interface SetlistFormProps {
  setlist?: Setlist
  onSubmit: (data: CreateSetlistInput) => void
  onCancel: () => void
}

export function SetlistForm({ setlist, onSubmit, onCancel }: SetlistFormProps) {
  const [name, setName] = useState(setlist?.name ?? '')
  const [venue, setVenue] = useState(setlist?.venue ?? '')
  const [date, setDate] = useState(
    setlist?.date ? new Date(setlist.date).toISOString().split('T')[0] : ''
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    onSubmit({
      name: name.trim(),
      venue: venue.trim() || undefined,
      date: date ? new Date(date) : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 p-6 rounded-2xl bg-white dark:bg-[#111218] border border-slate-200 dark:border-[#3b3f54]">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
          {setlist ? 'Edit Setlist' : 'New Setlist'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Friday Night Gig"
              className={cn(
                'w-full px-4 py-3 rounded-xl border-none',
                'bg-slate-100 dark:bg-[#282b39]',
                'text-slate-900 dark:text-white',
                'placeholder:text-slate-400 dark:placeholder:text-[#9da1b9]',
                'focus:outline-none focus:ring-2 focus:ring-primary'
              )}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Venue
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g., Blue Note Jazz Club"
              className={cn(
                'w-full px-4 py-3 rounded-xl border-none',
                'bg-slate-100 dark:bg-[#282b39]',
                'text-slate-900 dark:text-white',
                'placeholder:text-slate-400'
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={cn(
                'w-full px-4 py-3 rounded-xl border-none',
                'bg-slate-100 dark:bg-[#282b39]',
                'text-slate-900 dark:text-white'
              )}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-200 dark:bg-[#232948] text-slate-900 dark:text-white font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-medium shadow-lg shadow-primary/20"
            >
              {setlist ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
