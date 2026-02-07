import { cn } from '~/lib/utils'
import type { CreateSongInput } from '~/types'

interface SongFormProps {
  data: CreateSongInput
  onChange: (data: CreateSongInput) => void
  onSubmit: () => void
  submitLabel?: string
}

const KEYS = [
  'C', 'Cm', 'C#', 'C#m', 
  'D', 'Dm', 'D#', 'D#m', 
  'E', 'Em', 
  'F', 'Fm', 'F#', 'F#m', 
  'G', 'Gm', 'G#', 'G#m', 
  'A', 'Am', 'A#', 'A#m', 
  'B', 'Bm'
]
const TIME_SIGNATURES = ['4/4', '3/4', '6/8', '2/4', '5/4', '7/8']

export function SongForm({
  data,
  onChange,
  onSubmit,
  submitLabel = 'Save'
}: SongFormProps) {
  const handleChange = (field: keyof CreateSongInput, value: string | number | string[]) => {
    onChange({ ...data, [field]: value })
  }

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    handleChange('tags', tags)
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Title *
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Song title"
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-white dark:bg-[#1a1f36]',
            'border border-slate-200 dark:border-slate-700',
            'text-slate-900 dark:text-white',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500'
          )}
          required
        />
      </div>

      {/* Artist */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Artist *
        </label>
        <input
          type="text"
          value={data.artist}
          onChange={(e) => handleChange('artist', e.target.value)}
          placeholder="Artist name"
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-white dark:bg-[#1a1f36]',
            'border border-slate-200 dark:border-slate-700',
            'text-slate-900 dark:text-white',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500'
          )}
          required
        />
      </div>

      {/* Key & BPM Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Key
          </label>
          <select
            value={data.key}
            onChange={(e) => handleChange('key', e.target.value)}
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-white dark:bg-[#1a1f36]',
              'border border-slate-200 dark:border-slate-700',
              'text-slate-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500'
            )}
          >
            {KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            BPM
          </label>
          <input
            type="number"
            value={data.bpm}
            onChange={(e) => handleChange('bpm', parseInt(e.target.value) || 120)}
            min={20}
            max={300}
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-white dark:bg-[#1a1f36]',
              'border border-slate-200 dark:border-slate-700',
              'text-slate-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500'
            )}
          />
        </div>
      </div>

      {/* Time Signature & Duration Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Time Signature
          </label>
          <select
            value={data.timeSignature}
            onChange={(e) => handleChange('timeSignature', e.target.value)}
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-white dark:bg-[#1a1f36]',
              'border border-slate-200 dark:border-slate-700',
              'text-slate-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500'
            )}
          >
            {TIME_SIGNATURES.map((sig) => (
              <option key={sig} value={sig}>
                {sig}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Duration (seconds)
          </label>
          <input
            type="number"
            value={data.duration}
            onChange={(e) => handleChange('duration', parseInt(e.target.value) || 0)}
            min={0}
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-white dark:bg-[#1a1f36]',
              'border border-slate-200 dark:border-slate-700',
              'text-slate-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500'
            )}
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          value={data.tags?.join(', ') ?? ''}
          onChange={(e) => handleTagsChange(e.target.value)}
          placeholder="rock, classic, favorite"
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-white dark:bg-[#1a1f36]',
            'border border-slate-200 dark:border-slate-700',
            'text-slate-900 dark:text-white',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500'
          )}
        />
      </div>

      {/* Lyrics */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Lyrics & Chords
        </label>
        <textarea
          value={data.lyrics}
          onChange={(e) => handleChange('lyrics', e.target.value)}
          placeholder="Enter lyrics with chords in brackets, e.g., [Am]Hello [G]World"
          rows={12}
          className={cn(
            'w-full px-4 py-3 rounded-xl font-mono text-sm',
            'bg-white dark:bg-[#1a1f36]',
            'border border-slate-200 dark:border-slate-700',
            'text-slate-900 dark:text-white',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500',
            'resize-y'
          )}
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Use [Chord] notation for chords, e.g., [Am]Lyrics here[G]more lyrics
        </p>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Notes
        </label>
        <textarea
          value={data.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Performance notes, capo position, etc."
          rows={3}
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-white dark:bg-[#1a1f36]',
            'border border-slate-200 dark:border-slate-700',
            'text-slate-900 dark:text-white',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500',
            'resize-y'
          )}
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={onSubmit}
        disabled={!data.title || !data.artist}
        className={cn(
          'w-full py-4 rounded-xl font-semibold',
          'bg-indigo-500 text-white',
          'hover:bg-indigo-600 active:bg-indigo-700',
          'disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed',
          'transition-colors'
        )}
      >
        {submitLabel}
      </button>
    </div>
  )
}
