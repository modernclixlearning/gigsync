import { useState, useCallback } from 'react'
import { cn } from '~/lib/utils'
import type { UserProfile } from '~/types/profile'
import { INSTRUMENTS } from '~/types/profile'

export interface ProfileFormProps {
  profile: UserProfile
  onSave: (updates: Partial<UserProfile>) => Promise<void>
  onCancel: () => void
}

export function ProfileForm({ profile, onSave, onCancel }: ProfileFormProps) {
  const [formData, setFormData] = useState({
    name: profile.name,
    instrument: profile.instrument,
    band: profile.band || '',
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      try {
        setIsSaving(true)
        await onSave(formData)
      } finally {
        setIsSaving(false)
      }
    },
    [formData, onSave]
  )

  const handleChange = useCallback(
    (field: keyof typeof formData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData((prev) => ({
          ...prev,
          [field]: e.target.value,
        }))
      },
    []
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Field */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={handleChange('name')}
          placeholder="Your name"
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-white dark:bg-[#111218]',
            'border border-slate-200 dark:border-[#3b3f54]',
            'text-slate-900 dark:text-white',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-primary/50',
            'transition-colors'
          )}
        />
      </div>

      {/* Instrument Field */}
      <div>
        <label
          htmlFor="instrument"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Instrument
        </label>
        <select
          id="instrument"
          value={formData.instrument}
          onChange={handleChange('instrument')}
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-white dark:bg-[#111218]',
            'border border-slate-200 dark:border-[#3b3f54]',
            'text-slate-900 dark:text-white',
            'focus:outline-none focus:ring-2 focus:ring-primary/50',
            'transition-colors',
            'appearance-none cursor-pointer'
          )}
        >
          {INSTRUMENTS.map((instrument) => (
            <option key={instrument} value={instrument}>
              {instrument}
            </option>
          ))}
        </select>
      </div>

      {/* Band Field */}
      <div>
        <label
          htmlFor="band"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Band (optional)
        </label>
        <input
          type="text"
          id="band"
          value={formData.band}
          onChange={handleChange('band')}
          placeholder="Your band name"
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-white dark:bg-[#111218]',
            'border border-slate-200 dark:border-[#3b3f54]',
            'text-slate-900 dark:text-white',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-primary/50',
            'transition-colors'
          )}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className={cn(
            'flex-1 px-4 py-3 rounded-xl',
            'bg-slate-100 dark:bg-[#232948]',
            'text-slate-700 dark:text-slate-300',
            'font-medium',
            'hover:bg-slate-200 dark:hover:bg-[#2a3158]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors'
          )}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className={cn(
            'flex-1 px-4 py-3 rounded-xl',
            'bg-primary text-white',
            'font-medium',
            'hover:bg-primary/90',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors'
          )}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
